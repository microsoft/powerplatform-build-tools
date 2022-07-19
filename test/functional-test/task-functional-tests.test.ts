import { should, expect } from "chai";
import { fail } from "assert";
import process = require('process');
import { isRunningOnAgent } from "../../src/params/auth/isRunningOnAgent";
import { TaskTestBuilder, AuthTypes, TaskRunner, TaskInfo } from './functional-test-lib';
import * as path from 'path';
should();

const testTaskRootPathName = 'testTasksRootPath';
const outDir = path.resolve(__dirname, '..', '..', 'out');
const packagesRoot = path.resolve(outDir, 'packages');
const testBuilder: TaskTestBuilder = new TaskTestBuilder(AuthTypes.Legacy, packagesRoot);

describe('Build tools functional tests', function () {

  this.beforeAll(function (done: Mocha.Done) {
    try {
      process.env[testTaskRootPathName] = testBuilder.initializeTestFiles(() => { done(); });

    } catch (error) {
      fail(`${error}`);
    }
  });

  it('## Should run using agent context for functional tests', () => {
    isRunningOnAgent().should.be.true;
  });

  const tasks: TaskInfo[] = [
    { name: 'tool-installer', path: '/tasks/tool-installer/tool-installer-v0' },
    { name: 'who-am-i', path: '/tasks/whoami/whoami-v0' },
  ]

  tasks.forEach((taskInfo: TaskInfo) => {
    it(`Should run ${taskInfo.name} task using relative path ${taskInfo.path}`, function (done: Mocha.Done) {
      let testTasksRootPath = process.env[testTaskRootPathName];
      try {
        if (!testTasksRootPath) { fail(`Environment variable ${testTaskRootPathName} is not defined`); }
        const taskRunner: TaskRunner = new TaskRunner(taskInfo, testTasksRootPath);
        const result = taskRunner.runTask();

        expect(result.processResult.status).to.satisfy((status: number | null) => status == null || (Number.isInteger(status) && status === 0));

        done();
      } catch (error) {
        fail(`Failed to run task: ${taskInfo.name}; error: ${error}`)
      }
    });
  });

  this.afterAll(function (done: Mocha.Done) {
    testBuilder.cleanupTestFiles(() => { done(); });
  }
});



