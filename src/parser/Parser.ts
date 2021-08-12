// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { HostParameterEntry } from "@microsoft/powerplatform-cli-wrapper/dist/host/IHostAbstractions";
import { AzurePipelineTaskDefiniton, AzurePipelineTaskParameterDefiniton } from "./AzurePipelineDefinitions";

export class Parser {

  private convertAzTaskParameterToHostParameterEntry(sourceDef: Readonly<AzurePipelineTaskParameterDefiniton>): HostParameterEntry {
    return {
      name: sourceDef.name,
      required: sourceDef.required ?? false,
      defaultValue: sourceDef.defaultValue,
    };
  }

  public getHostParameterEntries(taskDefinition: AzurePipelineTaskDefiniton): Record<string, HostParameterEntry> {
    const typedData = taskDefinition.inputs.map(this.convertAzTaskParameterToHostParameterEntry);

    const parameterMap: Record<string, HostParameterEntry> = {};
    typedData.forEach(p => {
      parameterMap[p.name] = p;
    });
    return parameterMap;
  }

}
