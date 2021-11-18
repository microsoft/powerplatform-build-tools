// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { deleteEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../delete-environment/delete-environment-v0/task.json";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";

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

  await deleteEnvironment({
    credentials: getCredentials(),
    environmentUrl: parameterMap['EnvironmentUrl']
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
