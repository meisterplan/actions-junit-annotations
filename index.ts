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
            const data = await fs.promises.readFile(file);
            const json = JSON.parse(parser.toJson(data));
            if (json.testsuite) {
                const testsuite = json.testsuite;
                testDuration += Number(testsuite.time);
                numTests += Number(testsuite.tests);
                numErrored += Number(testsuite.errors);
                numFailed += Number(testsuite.failures);
                numSkipped += Number(testsuite.skipped);

                if (!Array.isArray(testsuite.testcase)) {
                    testsuite.testcase = [testsuite.testcase];
                }

                if (Array.isArray(testsuite.testcase)) {
                    for (const testcase of testsuite.testcase) {
                        if (testcase.failure) {
                            const annotations: Octokit.ChecksUpdateParamsOutputAnnotations[] = [];
                            const klass = testcase.classname.replace(/$.*/g, '').replace(/\./g, '/');
                            const path = `${testSrcPath}${klass}.java`;

                            const file = await fs.promises.readFile(path, { encoding: 'utf-8' });
                            //TODO: make this better won't deal with methods with arguments etc
                            let line = 0;
                            const lines = file.split('\n');
                            for (let i = 0; i < lines.length; i++) {
                                if (lines[i].indexOf(testcase.name) >= 0) {
                                    line = i;
                                    break;
                                }
                            }

                            annotations.push({
                                path: path,
                                start_line: line,
                                end_line: line,
                                start_column: 0,
                                end_column: 0,
                                annotation_level: 'failure',
                                message: `Junit test ${testcase.name} failed ${testcase.failure.message}`,
                            });

                            collectedAnnotations = collectedAnnotations.concat(annotations);
                        }
                    }
                }
            }
        }

        const octokit = new github.GitHub(accessToken);
        const listForRefRequest = {
            ...github.context.repo,
            ref: github.context.sha,
        };
        const res = await octokit.checks.listForRef(listForRefRequest);

        const checkRunId = res.data.check_runs.filter((check) => check.name === 'build')[0].id;

        const annotationLevel = numFailed + numErrored > 0 ? 'failure' : 'notice';
        const summaryAnnotation: Octokit.ChecksUpdateParamsOutputAnnotations = {
            path: testSrcPath,
            start_line: 0,
            end_line: 0,
            annotation_level: annotationLevel,
            message: `Junit Results ran ${numTests} in ${testDuration} seconds ${numErrored} Errored, ${numFailed} Failed, ${numSkipped} Skipped`,
        };

        collectedAnnotations.length = Math.min(collectedAnnotations.length, maxFailures);
        const checkUpdate = {
            ...github.context.repo,
            check_run_id: checkRunId,
            output: {
                title: 'Junit Results',
                summary: `Num passed etc`,
                annotations: [summaryAnnotation, ...collectedAnnotations],
            },
        };
        await octokit.checks.update(checkUpdate);
    } catch (error) {
        core.setFailed(error.message);
    }
})();
