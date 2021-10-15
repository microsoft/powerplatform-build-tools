// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { checkSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "./task.json";

(async () => {
  if (process.env.PP_BUILDTOOLS) {
    await main();
  }
})();

export async function main(): Promise<void> {
  try {
    const taskParser = new TaskParser();
    const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

    await checkSolution({
      credentials: getCredentials(),
      environmentUrl: getEnvironmentUrl(),
      solutionPath: parameterMap['FilesToAnalyze'],
      ruleLevelOverride: parameterMap['RulesToOverride'],
      outputDirectory: parameterMap['ArtifactDestinationName']
    }, runnerParameters, new BuildToolsHost());
  } catch (error) {
    const logger = runnerParameters.logger;
    logger.error(`failed: ${error}`);
  }
}
