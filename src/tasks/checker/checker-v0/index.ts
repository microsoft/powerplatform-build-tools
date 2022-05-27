// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { checkSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";

import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "./task.json";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { readEnvUrlFromServiceConnection } from '../../../params/auth/getEnvironmentUrl';

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

  await checkSolution({
    credentials: getCredentials(),
    environmentUrl: readEnvUrlFromServiceConnection(),
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
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
