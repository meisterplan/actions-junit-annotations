var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var _this = this;
var core = require('@actions/core');
var github = require('@actions/github');
var glob = require('@actions/glob');
var parser = require('xml2json');
var fs = require('fs');
(function () { return __awaiter(_this, void 0, void 0, function () {
    var path, includeSummary, numFailures_1, accessToken, testSrcPath_1, globber, numTests, numSkipped, numFailed, numErrored, testDuration, annotations_1, _a, _b, file, data, json, testsuite, _i, _c, testcase, e_1_1, octokit, req, res, check_run_id, annotation_level, annotation, update_req, error_1;
    var _this = this;
    var e_1, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 23, , 24]);
                path = core.getInput('path');
                includeSummary = core.getInput('includeSummary');
                numFailures_1 = core.getInput('numFailures');
                accessToken = core.getInput('access-token');
                testSrcPath_1 = core.getInput('testSrcPath');
                return [4 /*yield*/, glob.create(path, { followSymbolicLinks: false })];
            case 1:
                globber = _e.sent();
                numTests = 0;
                numSkipped = 0;
                numFailed = 0;
                numErrored = 0;
                testDuration = 0;
                annotations_1 = [];
                _e.label = 2;
            case 2:
                _e.trys.push([2, 14, 15, 20]);
                _a = __asyncValues(globber.globGenerator());
                _e.label = 3;
            case 3: return [4 /*yield*/, _a.next()];
            case 4:
                if (!(_b = _e.sent(), !_b.done)) return [3 /*break*/, 13];
                file = _b.value;
                return [4 /*yield*/, fs.promises.readFile(file)];
            case 5:
                data = _e.sent();
                json = JSON.parse(parser.toJson(data));
                if (!json.testsuite) return [3 /*break*/, 12];
                testsuite = json.testsuite;
                testDuration += Number(testsuite.time);
                numTests += Number(testsuite.tests);
                numErrored += Number(testsuite.errors);
                numFailed += Number(testsuite.failures);
                numSkipped += Number(testsuite.skipped);
                testFunction = function (testcase) { return __awaiter(_this, void 0, void 0, function () {
                    var klass, path_1, file_1, line, lines, i;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!testcase.failure) return [3 /*break*/, 2];
                                if (!(annotations_1.length < numFailures_1)) return [3 /*break*/, 2];
                                klass = testcase.classname.replace(/$.*/g, '').replace(/\./g, '/');
                                path_1 = "" + testSrcPath_1 + klass + ".java";
                                return [4 /*yield*/, fs.promises.readFile(path_1, { encoding: 'utf-8' })];
                            case 1:
                                file_1 = _a.sent();
                                line = 0;
                                lines = file_1.split('\n');
                                for (i = 0; i < lines.length; i++) {
                                    if (lines[i].indexOf(testcase.name) >= 0) {
                                        line = i;
                                        break;
                                    }
                                }
                                annotations_1.push({
                                    path: path_1,
                                    start_line: line,
                                    end_line: line,
                                    start_column: 0,
                                    end_column: 0,
                                    annotation_level: 'failure',
                                    message: "Junit test " + testcase.name + " failed " + testcase.failure.message
                                });
                                _a.label = 2;
                            case 2: return [2 /*return*/];
                        }
                    });
                }); };
                if (!Array.isArray(testsuite.testcase)) return [3 /*break*/, 10];
                _i = 0, _c = testsuite.testcase;
                _e.label = 6;
            case 6:
                if (!(_i < _c.length)) return [3 /*break*/, 9];
                testcase = _c[_i];
                return [4 /*yield*/, testFunction(testcase)];
            case 7:
                _e.sent();
                _e.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 6];
            case 9: return [3 /*break*/, 12];
            case 10: 
            //single test
            return [4 /*yield*/, testFunction(testsuite.testcase)];
            case 11:
                //single test
                _e.sent();
                _e.label = 12;
            case 12: return [3 /*break*/, 3];
            case 13: return [3 /*break*/, 20];
            case 14:
                e_1_1 = _e.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 20];
            case 15:
                _e.trys.push([15, , 18, 19]);
                if (!(_b && !_b.done && (_d = _a["return"]))) return [3 /*break*/, 17];
                return [4 /*yield*/, _d.call(_a)];
            case 16:
                _e.sent();
                _e.label = 17;
            case 17: return [3 /*break*/, 19];
            case 18:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 19: return [7 /*endfinally*/];
            case 20:
                octokit = new github.GitHub(accessToken);
                req = __assign(__assign({}, github.context.repo), { ref: github.context.sha });
                return [4 /*yield*/, octokit.checks.listForRef(req)];
            case 21:
                res = _e.sent();
                check_run_id = res.data.check_runs.filter(function (check) { return check.name === 'build'; })[0].id;
                annotation_level = numFailed + numErrored > 0 ? 'failure' : 'notice';
                annotation = {
                    path: 'test',
                    start_line: 0,
                    end_line: 0,
                    start_column: 0,
                    end_column: 0,
                    annotation_level: annotation_level,
                    message: "Junit Results ran " + numTests + " in " + testDuration + " seconds " + numErrored + " Errored, " + numFailed + " Failed, " + numSkipped + " Skipped"
                };
                update_req = __assign(__assign({}, github.context.repo), { check_run_id: check_run_id, output: {
                        title: 'Junit Results',
                        summary: "Num passed etc",
                        annotations: __spreadArrays([annotation], annotations_1)
                    } });
                return [4 /*yield*/, octokit.checks.update(update_req)];
            case 22:
                _e.sent();
                return [3 /*break*/, 24];
            case 23:
                error_1 = _e.sent();
                core.setFailed(error_1.message);
                return [3 /*break*/, 24];
            case 24: return [2 /*return*/];
        }
    });
}); })();
