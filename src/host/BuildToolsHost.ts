// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { HostParameterEntry, IHostAbstractions } from "@microsoft/powerplatform-cli-wrapper/dist/host/IHostAbstractions";
import { getInput } from 'azure-pipelines-task-lib';

export class BuildToolsHost implements IHostAbstractions {
  name = "Build-Tools";

  public getInput(entry: HostParameterEntry): string | undefined {
    return getInput(entry.name, entry.required);
  }
}
