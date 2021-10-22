// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { copyEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../copy-environment/copy-environment-v0/task.json";

(async () => {
  const taskParser = new TaskParser();
  const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

  await copyEnvironment({
    credentials: getCredentials(),
    sourceEnvironmentUrl: getEnvironmentUrl(),
    targetEnvironmentUrl: parameterMap['TargetEnvironmentUrl'],
    copyType: parameterMap['CopyType'],
    overrideFriendlyName: parameterMap['OverrideFriendlyName'],
    friendlyTargetEnvironmentName: parameterMap['FriendlyName']
  }, runnerParameters, new BuildToolsHost());
})().catch(error => {
  const logger = runnerParameters.logger;
  logger.error(`failed: ${error}`);
});
