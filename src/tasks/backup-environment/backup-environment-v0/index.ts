// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { backupEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../backup-environment/backup-environment-v0/task.json";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
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

  await backupEnvironment({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    backupLabel: parameterMap['BackupLabel']
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
