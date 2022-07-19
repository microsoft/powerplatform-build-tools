import { should } from "chai";
import taskTestBuilder from "./taskTestBuilder";
import * as cp from 'child_process';
import { fail } from "assert";
import process = require('process');
import { isRunningOnAgent } from "../../src/params/auth/isRunningOnAgent";

interface taskInfo {
  name: string;
  path: string;
}

should();

// convince tasks-under-test to run as if they were launched on an AzDevOps agent:
process.env['AGENT_JOBNAME'] = "AzDO job";
const testRunner: taskTestBuilder = new taskTestBuilder();
const testTaskRootPathName = 'testTasksRootPath'
describe('Build tools functaional tests', function () {

  const completedTasks: taskInfo[] = [];
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
    const toolInstaller: taskInfo = { name: 'tool-installer', path: `${testTasksRootPath}/tasks/tool-installer/tool-installer-v0` }
    console.log(`>>> start testing ${toolInstaller.name} (loaded from: ${toolInstaller.path})...`);
    try {
      const res = cp.spawnSync('node', [toolInstaller.path], { encoding: 'utf-8', cwd: testTasksRootPath });

      console.log(res.stdout);
      if (res.status != 0) {
        throw new Error(`Failed to run task: ${toolInstaller.name}; stderr: ${res.stderr}`);
      }

      const issues = extractIssues(res.stdout);

      if (issues[1] === 'error') {
        throw new Error(`tasks component test failed at: ${toolInstaller.name} (loaded from: ${toolInstaller.path})...\nstdout: ${res.stdout}`);
      }

      const setVars = extractSetVars(res.stdout);
      if (setVars[1]) {
        const varName = setVars[1].split(';')[0];
        const varValue = setVars[2];
        console.debug(`Setting pipeline var: ${varName} to: ${varValue}`);
        process.env[varName] = varValue;
      }
      completedTasks.push(toolInstaller);
      done();
    } catch (error) {
      fail(`Failed to run task: ${toolInstaller.name}; error: ${error}`)
    }
  });
});

function extractIssues(output: string): string[] {
  const regex = /^##vso\[task\.issue\s+type=(\S+);\](.+$)/m;

  const matches = output.match(regex);
  return matches || ['', ''];
}

function extractSetVars(output: string): string[] {
  const regex = /^##vso\[task\.setvariable\s+variable=(\S+);\](.+$)/m;

  const matches = output.match(regex);
  return matches || [];
}


