// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { EnvironmentResult, restoreEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../restore-environment/restore-environment-v0/task.json";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { isRunningOnAgent } from '../../../params/auth/isRunningOnAgent';
import { EnvUrlVariableName, EnvIdVariableName, SetTaskOutputVariable } from "../../../host/PipelineVariables";

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

  const restoreResult: EnvironmentResult = await restoreEnvironment({
    credentials: getCredentials(),
    sourceEnvironment: parameterMap['Environment'],
    targetEnvironment: parameterMap['TargetEnvironmentUrl'],
    restoreLatestBackup: parameterMap['RestoreLatestBackup'],
    backupDateTime: parameterMap['RestoreTimeStamp'],
    targetEnvironmentName: parameterMap['FriendlyName'],
  }, new BuildToolsRunnerParams(), new BuildToolsHost());

  if (!restoreResult.environmentUrl || !restoreResult.environmentId) {
    return tl.setResult(tl.TaskResult.SucceededWithIssues, 'CopyEnvironment call did NOT return the expected environment URL!');
  }
  // set output variables:
  SetTaskOutputVariable(EnvUrlVariableName, restoreResult.environmentUrl);
  SetTaskOutputVariable(EnvIdVariableName, restoreResult.environmentId);
}
