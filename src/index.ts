import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from '@actions/glob';
import * as parser from 'xml2json';
import * as fs from 'fs';
import { Globber } from '@actions/glob';
import { Octokit } from '@octokit/rest';

(async () => {
    try {
        const accessToken = core.getInput('access-token');

        const projectPath = core.getInput('projectPath');
        const junitSubPath = core.getInput('junitSubPath');
        const testSrcSubPath = core.getInput('testSrcSubPath');
        const maxFailures = Number(core.getInput('maxFailures'));

        const testSrcPath = projectPath + '/' + testSrcSubPath;
        const globber: Globber = await glob.create(projectPath + '/' + junitSubPath, { followSymbolicLinks: false });

        let numTests = 0;
        let numSkipped = 0;
        let numFailed = 0;
        let numErrored = 0;
        let testDuration = 0;

        let collectedAnnotations: Octokit.ChecksUpdateParamsOutputAnnotations[] = [];

        for await (const file of globber.globGenerator()) {
            core.info(`Analyzing $file`);
            const data = await fs.promises.readFile(file);
            const json = JSON.parse(parser.toJson(data.toString()));
            if (json.testsuite) {
                const testsuite = json.testsuite;
                core.info(`* Analyzing test suite ${testsuite.name}`);

                testDuration += Number(testsuite.time);
                numTests += Number(testsuite.tests);
                numErrored += Number(testsuite.errors);
                numFailed += Number(testsuite.failures);
                numSkipped += Number(testsuite.skipped);

                if (!Array.isArray(testsuite.testcase)) {
                    testsuite.testcase = [testsuite.testcase];
                }

                for (const testcase of testsuite.testcase) {
                    if (testcase.failure) {
                        core.info(`** Analyzing test case ${testcase.name}`);
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
                                const contentBeforeWithoutNewLines = contentBefore.replace('/n', '');
                                testFileLine = 1 + (contentBefore.length - contentBeforeWithoutNewLines.length);
                            }
                        }

                        annotations.push({
                            path: testFilePath,
                            start_line: testFileLine,
                            end_line: testFileLine,
                            annotation_level: 'failure',
                            message: `JUnit ${testsuite.name}::${testcase.name} failed`,
                            raw_details: testcase.failure.message,
                        });

                        collectedAnnotations = collectedAnnotations.concat(annotations);
                    }
                }
            }
        }

        const octokit = new github.GitHub(accessToken);
        const checkRunId = Number(process.env.GITHUB_RUN_ID);

        const annotationLevel = numFailed + numErrored > 0 ? 'failure' : 'notice';
        const summaryMessage = `JUnit Results for ${numTests} tests in ${testDuration} seconds: ${numErrored} error(s), ${numFailed} fail(s), ${numSkipped} skip(s)`;
        const summaryAnnotation: Octokit.ChecksUpdateParamsOutputAnnotations = {
            path: testSrcPath,
            start_line: 0,
            end_line: 0,
            annotation_level: annotationLevel,
            message: summaryMessage,
        };
        core.info(summaryMessage);

        collectedAnnotations.length = Math.min(collectedAnnotations.length, maxFailures);
        const checkUpdate: Octokit.ChecksUpdateParams = {
            ...github.context.repo,
            check_run_id: checkRunId,
            output: {
                title: 'JUnit Results',
                summary: summaryMessage,
                annotations: [summaryAnnotation, ...collectedAnnotations],
            },
        };
        core.info(`Updating annotations of run ${checkRunId}`);
        await octokit.checks.update(checkUpdate);
    } catch (error) {
        core.setFailed(error.message);
    }
})();
