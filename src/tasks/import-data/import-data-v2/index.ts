// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { dataImport } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from '../../../params/auth/getEnvironmentUrl';
import { isRunningOnAgent } from '../../../params/auth/isRunningOnAgent';
import * as taskDefinitionData from "./task.json";
import { TaskParser } from "../../../parser/TaskParser";
import { AzurePipelineTaskDefiniton } from 'src/parser/AzurePipelineDefinitions';
import { BuildToolsHost } from "../../../host/BuildToolsHost";

(async () => {
  if (isRunningOnAgent()) {
      await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});


export async function main(): Promise<void> {
  const taskParser = new TaskParser();
  const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

  await dataImport({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    dataDirectory: parameterMap['DataDirectory'],
    verbose: {
      name: "Verbose",
      required: false,
      defaultValue: false
    },
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
