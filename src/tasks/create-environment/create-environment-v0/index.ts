// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { createEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "../../create-environment/create-environment-v0/task.json";

(async () => {
  if (process.env.PP_BUILDTOOLS) {
    await main();
  }
})();

export async function main(): Promise<void> {
  try {
    const taskParser = new TaskParser();
    const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

    await createEnvironment({
      credentials: getCredentials(),
      environmentName: parameterMap['DisplayName'],
      environmentType: parameterMap['EnvironmentSku'],
      region: parameterMap['LocationName'],
      currency: parameterMap['CurrencyName'],
      language: parameterMap['LanguageName'],
      templates: parameterMap['AppsTemplate'],
      domainName: parameterMap['DomainName'],
    }, runnerParameters, new BuildToolsHost());
  } catch (error) {
    const logger = runnerParameters.logger;
    logger.error(`failed: ${error}`);
  }
}
