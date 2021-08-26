// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { HostParameterEntry } from "@microsoft/powerplatform-cli-wrapper/dist/host/IHostAbstractions";
import { AzurePipelineTaskDefiniton } from "./AzurePipelineDefinitions";

export class TaskParser {
  public getHostParameterEntries(taskDefinition: AzurePipelineTaskDefiniton): Record<string, HostParameterEntry> {
    const typedData = taskDefinition.inputs.map(taskParameter => ({
      name: taskParameter.name,
      required: taskParameter.required ?? false,
      defaultValue: taskParameter.defaultValue
    }));

    const parameterMap: Record<string, HostParameterEntry> = {};
    typedData.forEach(p => {
      parameterMap[p.name] = p;
    });
    return parameterMap;
  }
}
