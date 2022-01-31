// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { HostParameterEntry, IHostAbstractions } from "@microsoft/powerplatform-cli-wrapper/dist/host/IHostAbstractions";
import * as tl from 'azure-pipelines-task-lib/task';
import { getEnvironmentUrl } from "../params/auth/getEnvironmentUrl";

export class BuildToolsHost implements IHostAbstractions {
  name = "Build-Tools";

  public getInput(entry: HostParameterEntry): string | undefined {
    if(entry.name === 'Environment')
      return getEnvironmentUrl();


    const value = tl.getInput(entry.name, entry.required);
    // normalize value to always be undefined if the user has not declared the input value
    return (value && value.trim() !== '') ? value : undefined;
  }
}
