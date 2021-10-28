// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { exportSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../export-solution/export-solution-v0/task.json";

(async () => {
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
  }, runnerParameters, new BuildToolsHost());
})().catch(error => {
  const logger = runnerParameters.logger;
  logger.error(`failed: ${error}`);
});
