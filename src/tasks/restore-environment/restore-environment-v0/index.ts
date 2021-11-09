// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { restoreEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../restore-environment/restore-environment-v0/task.json";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { isRunningOnAgent } from '../../../params/auth/isRunningOnAgent';

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

  await restoreEnvironment({
    credentials: getCredentials(),
    sourceEnvironmentUrl: getEnvironmentUrl(),
    targetEnvironmentUrl: parameterMap['TargetEnvironmentUrl'],
    restoreLatestBackup: parameterMap['RestoreLatestBackup'],
    backupDateTime: parameterMap['RestoreTimeStamp'],
    targetEnvironmentName: parameterMap['FriendlyName'],
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
