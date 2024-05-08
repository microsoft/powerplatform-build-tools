// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { createEnvironment, EnvironmentResult } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { EnvIdVariableName, EnvUrlVariableName, SetTaskOutputVariable } from "../../../host/PipelineVariables";

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

  const createResult: EnvironmentResult = await createEnvironment({
    credentials: getCredentials(),
    environmentName: parameterMap['DisplayName'],
    environmentType: parameterMap['EnvironmentSku'],
    user: parameterMap['User'],
    region: parameterMap['LocationName'],
    currency: parameterMap['CurrencyName'],
    language: parameterMap['LanguageName'],
    templates: parameterMap['AppsTemplate'],
    domainName: parameterMap['DomainName'],
    teamId: parameterMap['TeamId'],
    securityGroupId: parameterMap['SecurityGroupId'],
    logToConsole: isDiagnosticsMode ? true : false
  }, new BuildToolsRunnerParams(), new BuildToolsHost());

  if (!createResult.environmentUrl || !createResult.environmentId) {
    return tl.setResult(tl.TaskResult.SucceededWithIssues, 'CreateEnvironment call did NOT return the expected environment URL!');
  }
  // set output variables:
  SetTaskOutputVariable(EnvUrlVariableName, createResult.environmentUrl);
  SetTaskOutputVariable(EnvIdVariableName, createResult.environmentId);
}
