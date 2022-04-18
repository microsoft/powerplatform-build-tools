// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { EnvironmentResult, resetEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../reset-environment/reset-environment-v0/task.json";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { isRunningOnAgent } from '../../../params/auth/isRunningOnAgent';
import { EnvIdVariableName, EnvUrlVariableName, SetTaskOutputVariable } from "../../../host/PipelineVariables";

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

  const resetResult: EnvironmentResult = await resetEnvironment({
    credentials: getCredentials(),
    environment: parameterMap['Environment'],
    currency: parameterMap['CurrencyName'],
    purpose: parameterMap['Purpose'],
    templates: parameterMap['AppsTemplate'],
    language: parameterMap['Language'],
    overrideDomainName: parameterMap['OverrideDomainName'],
    domainName: parameterMap['DomainName'],
    overrideFriendlyName: parameterMap['OverrideFriendlyName'],
    friendlyEnvironmentName: parameterMap['FriendlyName'],
  }, new BuildToolsRunnerParams(), new BuildToolsHost());

  if (!resetResult.environmentUrl || !resetResult.environmentId) {
    return tl.setResult(tl.TaskResult.SucceededWithIssues, 'ResetEnvironment call did NOT return the expected environment URL!');
  }
  // set output variables:
  SetTaskOutputVariable(EnvUrlVariableName, resetResult.environmentUrl);
  SetTaskOutputVariable(EnvIdVariableName, resetResult.environmentId);
}
