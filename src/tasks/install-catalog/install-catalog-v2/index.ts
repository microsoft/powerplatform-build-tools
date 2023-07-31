// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { installCatalog } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";

import * as taskDefinitionData from "./task.json";

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
  const isDiagnosticsMode = tl.getVariable('agent.diagnostic');

  await installCatalog({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    catalogItemId: parameterMap['CatalogItemId'],
    targetEnvironmentUrl: parameterMap['TargetEnvironmentUrl'],
    settings: parameterMap['Settings'],
    targetVersion: parameterMap['TargetVersion'],
    pollStatus: parameterMap['PollStatus'],
    logToConsole: isDiagnosticsMode ? true : false
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
