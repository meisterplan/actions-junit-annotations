import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from '@actions/glob';
import * as parser from 'xml2json';
import * as fs from 'fs';
import { Globber } from '@actions/glob';
import { Octokit } from '@octokit/rest';
import * as path from 'path';

(async () => {
    try {
        const githubToken = core.getInput('githubToken');

        const projectPath = core.getInput('projectPath');
        const junitSubPath = core.getInput('junitSubPath');
        const testSrcSubPath = core.getInput('testSrcSubPath');
        const maxFailures = Number(core.getInput('maxFailures'));
        const jobName = core.getInput('jobName');

        const testSrcPath = projectPath + '/' + testSrcSubPath;
        const globber: Globber = await glob.create(projectPath + '/' + junitSubPath, { followSymbolicLinks: false });

        let numTests = 0;
        let numSkipped = 0;
        let numFailed = 0;
        let numErrored = 0;
        let testDuration = 0;

        let collectedAnnotations: Octokit.ChecksUpdateParamsOutputAnnotations[] = [];

        for await (const file of globber.globGenerator()) {
            core.info(`Analyzing ${file}`);
            const data = await fs.promises.readFile(file);
            const json = JSON.parse(parser.toJson(data.toString()));
            if (json.testsuite) {
                const testsuite = json.testsuite;
                core.debug(`* Analyzing test suite ${testsuite.name}`);

                testDuration += Number(testsuite.time);
                numTests += Number(testsuite.tests);
                numErrored += Number(testsuite.errors);
                numFailed += Number(testsuite.failures);
                numSkipped += Number(testsuite.skipped);

                if(!testsuite.testcase) {
                    testsuite.testcase = [];
                } else if (!Array.isArray(testsuite.testcase)) {
                    testsuite.testcase = [testsuite.testcase];
                }

                for (const testcase of testsuite.testcase) {
                    if (testcase.failure) {
                        core.debug(`** Analyzing failed test case ${testcase.name}`);
                        const annotations: Octokit.ChecksUpdateParamsOutputAnnotations[] = [];
                        const className = testcase.classname || testsuite.classname || 'unknown';
                        const testName = (testcase.name || 'unknown').replace('It: ', '');
                        // the replace makes it work with kotest's DescribeSpec

                        const testFileNameSuspect = className.replace(/$.*/g, '').replace(/\./g, '/') + '*';
                        const testFileSuspectGlob = await glob.create(testSrcPath + testFileNameSuspect);
                        const testFileSuspects = await testFileSuspectGlob.glob();

                        let testFileLine = 0;
                        let testFilePath = '';
                        if (testFileSuspects.length == 1) {
                            testFilePath = testFileSuspects[0];

                            const testFileContents = await fs.promises.readFile(testFilePath, { encoding: 'utf-8' });
                            const testPosition = testFileContents.indexOf(testName);
                            if (testPosition >= 0) {
                                const contentBefore = testFileContents.substring(0, testPosition);
                                const contentBeforeWithoutNewLines = contentBefore.replace(/\n/g, '');

                                testFileLine = 1 + (contentBefore.length - contentBeforeWithoutNewLines.length);
                            }
                        } else {
                            core.info(`Did not find/Found too many referenced file(s): ${testFileNameSuspect}`);
                        }

                        annotations.push({
                            path: path.relative(process.cwd(), testFilePath),
                            start_line: testFileLine,
                            end_line: testFileLine,
                            annotation_level: 'failure',
                            message: `${testsuite.name}::${testcase.name} failed: ${testcase.failure.message}`,
                            raw_details: testcase.failure['$t'],
                        });

                        collectedAnnotations = collectedAnnotations.concat(annotations);
                    }
                }
            }
        }

        const annotationLevel = numFailed + numErrored > 0 ? 'failure' : 'notice';
        const summaryMessage = `JUnit Results for ${numTests} tests in ${testDuration.toFixed(
            1
        )} seconds: ${numErrored} error(s), ${numFailed} fail(s), ${numSkipped} skip(s)`;
        const summaryAnnotation: Octokit.ChecksUpdateParamsOutputAnnotations = {
            path: testSrcPath,
            start_line: 0,
            end_line: 0,
            annotation_level: annotationLevel,
            message: summaryMessage,
        };
        core.info(summaryMessage);

        const octokit = new github.GitHub(githubToken);

        // identify check run to annotate
        let checkRunId = -1;
        const getWorkflowRunParams: Octokit.ActionsGetWorkflowRunParams = {
            ...github.context.repo,
            run_id: Number(process.env['GITHUB_RUN_ID']), // you'd think this should be in the context variable
        };
        core.debug(`Getting workflow run for ${getWorkflowRunParams.run_id}...`);
        const getWorkflowRun = await octokit.actions.getWorkflowRun(getWorkflowRunParams);
        // great API, the value `check_suite_id` is not set in the response...
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkSuiteIdArray = (getWorkflowRun.data as any).check_suite_url.match(/\d+/g);
        if (checkSuiteIdArray && checkSuiteIdArray.length == 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            core.setFailed(`Found no checksuite id in URL ${(getWorkflowRun.data as any).check_suite_url}`);
            return;
        }
        const listCheckRunsParams: Octokit.ChecksListForSuiteParams = {
            ...github.context.repo,
            check_suite_id: checkSuiteIdArray[checkSuiteIdArray.length - 1],
        };
        core.debug(`Listing check runs for suite ${listCheckRunsParams.check_suite_id}...`);
        const listCheckRuns = await octokit.checks.listForSuite(listCheckRunsParams);
        const checkRun = listCheckRuns.data.check_runs.find((run) => run.name.includes(jobName));
        if (checkRun) {
            checkRunId = checkRun.id;
        }

        if (checkRunId == -1) {
            core.setFailed(`Found no job to annotate with name ${jobName} in current workflow...`);
            return;
        } else {
            core.info(`Updating check run ${checkRunId}`);
        }

        collectedAnnotations.length = Math.min(collectedAnnotations.length, maxFailures);
        const checkCreateParams: Octokit.ChecksUpdateParams = {
            ...github.context.repo,
            check_run_id: checkRunId,
            output: {
                title: 'JUnit Results',
                summary: summaryMessage,
                annotations: [summaryAnnotation, ...collectedAnnotations],
            },
        };
        await octokit.checks.update(checkCreateParams);
    } catch (error) {
        core.setFailed(error.message);
    }
})();
