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

  // backwards compatibility: check if user still has assigned the now deprecated PublishWorkflows:
  // goal is to ensure activatePlugins is set if either tp deprecated or tne new input property are set
  const publishWorkflows = tl.getInput("PublishWorkflows", false);
  const activatePlugins = tl.getInput("ActivatePlugins", false);
  const activatePluginsMerged = publishWorkflows === 'true' || activatePlugins === 'true';

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
    publishChanges: parameterMap['PublishCustomizationChanges'],
    skipDependencyCheck: parameterMap['SkipProductUpdateDependencies'],
    skipLowerVersion: parameterMap['SkipLowerVersion'],
    convertToManaged: parameterMap['ConvertToManaged'],
    // WORKAROUND: current IHostAbstractions and its input processing in cli-wrapper will only look at the default value
    // IFF the actual property name does NOT exist in task.json -> MergedActivePlugin is NOT defined in task, thus forcing
    // cli-wrapper to accept the calculated activatePluginMerged as default value.
    // TODO: reconsider cli-wrapper's host abstraction design, but beyond this hot fix
    activatePlugins: { name: "MergedActivatePlugin", required: false, defaultValue: activatePluginsMerged }
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
