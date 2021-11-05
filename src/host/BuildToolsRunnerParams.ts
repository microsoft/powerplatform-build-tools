// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { Logger, RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import buildToolsLogger from "./logger";

const EnvVarPrefix = 'POWERPLATFORMTOOLS_';
export const PacPathEnvVarName = `${EnvVarPrefix}PACCLIPATH`;

export class BuildToolsRunnerParams implements RunnerParameters {
  private _workingDir: string;
  private _runnersDir: string | undefined;

  public constructor() {
    this._workingDir = cwd();
  }

  public get logger(): Logger {
    return buildToolsLogger;
  }

  public get runnersDir(): string {
    // lazy evaluation to determine pac CLI location from ToolInstaller task's discovery:
    if (!this._runnersDir) {
      const pacPath = tl.getVariable(PacPathEnvVarName);
      if (!pacPath) {
        throw new Error(`Cannot find required pac CLI, Tool-Installer task was not called before this task!`);
      }
      this._runnersDir = (pacPath as string);
    }
    return this._runnersDir;
  }

  public get workingDir(): string {
    return this._workingDir;
  }
}
