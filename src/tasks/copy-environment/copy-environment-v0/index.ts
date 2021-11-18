// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { copyEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../copy-environment/copy-environment-v0/task.json";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";

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

  await copyEnvironment({
    credentials: getCredentials(),
    sourceEnvironmentUrl: parameterMap['SourceEnvironmentUrl'],
    targetEnvironmentUrl: parameterMap['TargetEnvironmentUrl'],
    copyType: parameterMap['CopyType'],
    overrideFriendlyName: parameterMap['OverrideFriendlyName'],
    friendlyTargetEnvironmentName: parameterMap['FriendlyName']
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
