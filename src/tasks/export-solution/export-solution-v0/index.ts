// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { exportSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../export-solution/export-solution-v0/task.json";
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

  await exportSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    name: parameterMap['SolutionName'],
    path: parameterMap['SolutionOutputFile'],
    managed: parameterMap['Managed'],
    targetVersion: parameterMap['TargetVersion'],
    async: parameterMap['AsyncOperation'],
    maxAsyncWaitTimeInMin: parameterMap['MaxAsyncWaitTime'],
    autoNumberSettings: parameterMap['ExportAutoNumberingSettings'],
    calenderSettings: parameterMap['ExportCalendarSettings'],
    customizationSettings: parameterMap['ExportCustomizationSettings'],
    emailTrackingSettings: parameterMap['ExportEmailTrackingSettings'],
    externalApplicationSettings: parameterMap['ExportExternalApplicationSettings'],
    generalSettings: parameterMap['ExportGeneralSettings'],
    isvConfig: parameterMap['ExportIsvConfig'],
    marketingSettings: parameterMap['ExportMarketingSettings'],
    outlookSynchronizationSettings: parameterMap['ExportOutlookSynchronizationSettings'],
    relationshipRoles: parameterMap['ExportRelationshipRoles'],
    sales: parameterMap['ExportSales'],
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
