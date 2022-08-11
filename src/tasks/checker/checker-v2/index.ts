// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { checkSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";

import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AuthenticationType } from '../../../params/auth/getAuthenticationType';
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { readEnvUrlFromServiceConnection } from '../../../params/auth/getEnvironmentUrl';

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
  const defaultAuthType: AuthenticationType = 'PowerPlatformSPN';

  await checkSolution({
    // PS impl only supported single auth mode, SPN; some pipelines have no explicit value for authenticationType
    credentials: getCredentials(defaultAuthType),
    environmentUrl: readEnvUrlFromServiceConnection(defaultAuthType),
    fileLocation: parameterMap['FileLocation'],
    solutionPath: parameterMap['FilesToAnalyze'],
    solutionUrl: parameterMap['FilesToAnalyzeSasUri'],
    filesExcluded: parameterMap['FilesToExclude'],
    ruleLevelOverride: parameterMap['RulesToOverride'],
    ruleSet: parameterMap['RuleSet'],
    errorLevel: parameterMap['ErrorLevel'],
    errorThreshold: parameterMap['ErrorThreshold'],
    failOnAnalysisError: parameterMap['FailOnPowerAppsCheckerAnalysisError'],
    artifactStoreName: parameterMap['ArtifactDestinationName'],
    useDefaultPAEndpoint: parameterMap['UseDefaultPACheckerEndpoint'],
    customPAEndpoint: parameterMap['CustomPACheckerEndpoint'],
    geoInstance: { name: "GeoInstance", required: false, defaultValue: undefined }
  }, new BuildToolsRunnerParams(), new BuildToolsHost('PowerAppsChecker'));
}
