// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { unpackSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "./task.json";
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

  await unpackSolution({
    solutionZipFile: parameterMap['SolutionInputFile'],
    sourceFolder: parameterMap['SolutionTargetFolder'],
    solutionType: parameterMap['SolutionType'],
    overwriteFiles: parameterMap['OverwriteFiles'],
    errorLevel: parameterMap['ErrorLevel'],
    singleComponent: parameterMap['SingleComponent'],
    mapFile: parameterMap['MapFile'],
    localeTemplate: parameterMap['LocaleTemplate'],
    localize: parameterMap['Localize'],
    useLcid: parameterMap['UseLcid'],
    useUnmanagedFileForManaged: parameterMap['UseUnmanagedFileForMissingManaged'],
    disablePluginRemap: parameterMap['DisablePluginRemap'],
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
