import { should, expect } from "chai";
import TaskTestBuilder from "./taskTestBuilder";
import { fail } from "assert";
import process = require('process');
import { isRunningOnAgent } from "../../src/params/auth/isRunningOnAgent";
import { TaskRunner, TaskInfo } from "./taskTestRunner";

should();

// convince tasks-under-test to run as if they were launched on an AzDevOps agent:
process.env['AGENT_JOBNAME'] = "AzDO job";
const testRunner: TaskTestBuilder = new TaskTestBuilder();
const testTaskRootPathName = 'testTasksRootPath'
describe('Build tools functaional tests', function () {

  this.beforeAll(function (done: Mocha.Done) {
    try{
    process.env[testTaskRootPathName] = testRunner.initializeTestFiles(() => { done(); });
    } catch (e) {
      fail(`${e}`);
    }

  });

  it('## Should run using agent context for functional tests', () => {
    isRunningOnAgent().should.be.true;
  });

  it('Should install tools', function (done: Mocha.Done) {
    let testTasksRootPath = process.env[testTaskRootPathName];
    const toolInstaller: TaskInfo = { name: 'tool-installer', path: `${testTasksRootPath}/tasks/tool-installer/tool-installer-v0` }
    try {
      if(!testTasksRootPath) {fail(`Environment variable ${testTaskRootPathName} is not defined`);}
      const taskRunner: TaskRunner =  new TaskRunner(toolInstaller, testTasksRootPath);
      const result = taskRunner.runTask();

      expect(result.processResult.status).to.satisfy((status: number | null) => status == null || (Number.isInteger(status) && status === 0));

      done();
    } catch (error) {
      fail(`Failed to run task: ${toolInstaller.name}; error: ${error}`)
    }
  });
});



