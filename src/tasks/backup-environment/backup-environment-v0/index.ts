// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { backupEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../backup-environment/backup-environment-v0/task.json";

(async () => {
  const taskParser = new TaskParser();
  const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

  await backupEnvironment({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    backupLabel: parameterMap['BackupLabel']
  }, runnerParameters, new BuildToolsHost());
})();
