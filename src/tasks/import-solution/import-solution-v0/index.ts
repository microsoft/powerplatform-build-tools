// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { importSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../import-solution/import-solution-v0/task.json";
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

  // backwards compatibility: check if user still has assigned the now deprecated PublishWorkflows:
  // getInput will return 'undefined' if input is not assigned in yaml, but usually false if classic GUI task editor is used
  const publishWorkflows = tl.getInput("PublishWorkflows", false);

  await importSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    path: parameterMap['SolutionInputFile'],
    useDeploymentSettingsFile: parameterMap['UseDeploymentSettingsFile'],
    deploymentSettingsFile: parameterMap['DeploymentSettingsFile'],
    async: parameterMap['AsyncOperation'],
    maxAsyncWaitTimeInMin: parameterMap['MaxAsyncWaitTime'],
    importAsHolding: parameterMap['HoldingSolution'],
    forceOverwrite: parameterMap['OverwriteUnmanagedCustomizations'],
    publishChanges: parameterMap['PublishWorkflows'],
    skipDependencyCheck: parameterMap['SkipProductUpdateDependencies'],
    convertToManaged: parameterMap['ConvertToManaged'],
    // the fallback for default value 'true' corresponds with task.json's default value
    // the intended outcome: ensure if either ActivatePlugins OR PublishWorkflows is true, send true to DV:
    activatePlugins: { name: "ActivatePlugins", required: false, defaultValue: publishWorkflows || true }
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
