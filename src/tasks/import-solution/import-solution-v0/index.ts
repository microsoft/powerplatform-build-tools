// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { importSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../import-solution/import-solution-v0/task.json";

(async () => {
  const taskParser = new TaskParser();
  const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

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
    activatePlugins: parameterMap['ActivatePlugins']
  }, runnerParameters, new BuildToolsHost());
})();
