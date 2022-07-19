import * as cp from 'child_process';
import path = require('path');
import process = require('process');

export interface TaskInfo {
  name: string;
  path: string;
  inputVariables?: EnvironmentVariableDefinition[];
}

export interface TaskResult {
  processResult:cp.SpawnSyncReturns<string>;
  outputEnvironmentVariable?: EnvironmentVariableDefinition;
}

export interface EnvironmentVariableDefinition {
  name: string;
  value: string;
}

export class TaskRunner {
  private taskResult:cp.SpawnSyncReturns<string> | undefined = undefined;
  taskInfo: TaskInfo;
  taskDirectory: string;

  constructor(taskInfo: TaskInfo, taskDirectory: string) {
    this.taskInfo = taskInfo;
    this.taskDirectory = taskDirectory;
  }

  runTask(): TaskResult{
    const normalizedTaskPath = this.normalizeAbsoluteTaskPath()
    this.taskResult = cp.spawnSync('node', [normalizedTaskPath], { encoding: 'utf-8', cwd: this.taskDirectory });
    console.log(this.taskResult.stdout);
    this.validateTaskRun();
    var envVar = this.setOutputEnvironmentVariables();
    return {processResult: this.taskResult, outputEnvironmentVariable: envVar };
  }

  private normalizeAbsoluteTaskPath() {
    return (path.join(this.taskDirectory, this.taskInfo.path)).replace(/\\/g, '/');
  }

  private setOutputEnvironmentVariables(): EnvironmentVariableDefinition | undefined {
    if(!this.taskResult) return;
    const setVars = this.extractSetVars(this.taskResult.stdout);
    if (setVars[1]) {
      const envVar : EnvironmentVariableDefinition = { name: setVars[1].split(';')[0], value: setVars[2] };
      console.debug(`Setting environment variable: ${envVar.name} to: ${envVar.value}`);
      process.env[envVar.name] = envVar.value;
    }
  }

  private validateTaskRun() {
    if(!this.taskResult) return;

    if (this.taskResult.status != 0) {
      throw new Error(`Failed to run task: ${this.taskInfo.name}; stderr: ${this.taskResult.stderr}`);
    }

    const issues = this.extractIssues(this.taskResult.stdout);
    if (issues[1] === 'error') {
      throw new Error(`tasks component test failed at: ${this.taskInfo.name} (loaded from: ${this.taskInfo.path})...\nstdout: ${this.taskResult.stdout}`);
    }
  }

  private extractIssues(output: string): string[] {
    const regex = /^##vso\[task\.issue\s+type=(\S+);\](.+$)/m;

    const matches = output.match(regex);
    return matches || ['', ''];
  }

  private extractSetVars(output: string): string[] {
    const regex = /^##vso\[task\.setvariable\s+variable=(\S+);\](.+$)/m;

    const matches = output.match(regex);
    return matches || [];
  }
}
