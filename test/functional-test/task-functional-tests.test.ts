import { should, expect } from 'chai';
import { fail } from 'assert';
import process = require('process');
import { isRunningOnAgent } from '../../src/params/auth/isRunningOnAgent';
import { TaskTestBuilder, AuthTypes, TaskRunner, TaskInfo } from './functional-test-lib';
import * as path from 'path';
import { tasksToTest } from './taskTestInput';

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

  tasksToTest.forEach((taskInfo: TaskInfo) => {
    it(`Should run ${taskInfo.name} task succesfully.`, function (done: Mocha.Done) {
      let testTasksRootPath = process.env[testTaskRootPathName] ?? fail(`Environment variable ${testTaskRootPathName} is not defined`);
      try {
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
    let testTasksRootPath = process.env[testTaskRootPathName] ?? fail(`Environment variable ${testTaskRootPathName} is not defined`);
    const deleteEnvironment: TaskInfo = {
      name: 'delete-environment',
      path: '/tasks/delete-environment/delete-environment-v0'
    }
      const taskRunner: TaskRunner = new TaskRunner(deleteEnvironment, testTasksRootPath);
      taskRunner.runTask();
  });

});



