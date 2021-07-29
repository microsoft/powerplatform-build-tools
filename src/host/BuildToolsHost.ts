// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { IHostAbstractions } from "@microsoft/powerplatform-cli-wrapper/dist/host";
import { getInput, cwd } from 'azure-pipelines-task-lib';
import path = require('path');

export class BuildToolsHost implements IHostAbstractions {

  public getValidInput(name: string, required: true): string | never;
  public getValidInput(name: string, required: boolean): string | undefined;
  public getValidInput(name: string, required: boolean): string | undefined {
    return getInput(name, required);
  }

  public getInputAsBool(name: string, required: boolean, defaultValue: boolean): boolean {
    const textValue = this.getValidInput(name, required);
    return (!textValue) ? defaultValue : textValue === 'true';
  }

  public getWorkingDirectory(name: string, required: boolean, defaultValue?: string): string {
    const workingDir = cwd();
    const textValue = this.getValidInput(name, required);
    return (!textValue) ? (defaultValue ?? cwd()) : path.resolve(workingDir, textValue);
  }
}
