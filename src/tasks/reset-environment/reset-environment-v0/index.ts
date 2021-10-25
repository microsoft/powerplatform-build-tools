// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { resetEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../reset-environment/reset-environment-v0/task.json";

(async () => {
  const taskParser = new TaskParser();
  const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

  await resetEnvironment({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    language: parameterMap['Language'],
    overrideDomainName: parameterMap['OverrideDomainName'],
    domainName: parameterMap['DomainName'],
    overrideFriendlyName: parameterMap['OverrideFriendlyName'],
    friendlyEnvironmentName: parameterMap['FriendlyName'],
  }, runnerParameters, new BuildToolsHost());
})().catch(error => {
  const logger = runnerParameters.logger;
  logger.error(`failed: ${error}`);
});
