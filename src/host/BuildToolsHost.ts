// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { IHostAbstractions, HostParameterEntry, WorkingDirectoryParameters } from "@microsoft/powerplatform-cli-wrapper/dist/host/IHostAbstractions";
import { getInput, cwd } from 'azure-pipelines-task-lib';

export class BuildToolsHost implements IHostAbstractions {

  name = "Build-Tools";

  public getValidInput(name: string, required: true): string | never;
  public getValidInput(name: string, required: boolean): string | undefined;
  public getValidInput(name: string, required: boolean): string | undefined {
    return getInput(name, required);
  }

  public getWorkingDirectory(params: HostParameterEntry): string | WorkingDirectoryParameters {
    const workingDir = cwd();
    const textValue = this.getValidInput(params.name, params.required);
    return (!textValue) ? (typeof params.defaultValue === 'string' ? params.defaultValue : cwd()) : { workingDir: workingDir, path: textValue };
  }
}
