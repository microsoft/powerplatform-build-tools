import { should, expect } from "chai";
import TaskTestBuilder, { AuthTypes } from "./taskTestBuilder";
import { fail } from "assert";
import process = require('process');
import { isRunningOnAgent } from "../../src/params/auth/isRunningOnAgent";
import { TaskRunner, TaskInfo } from "./taskTestRunner";
import os = require('os');

should();

const testBuilder: TaskTestBuilder = new TaskTestBuilder(AuthTypes.Legacy);
const testTaskRootPathName = 'testTasksRootPath'

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
});



