import { unpackSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "./task.json";

(async () => {
  if (process.env['Agent.JobName']) {
      await main();
  }
})();

export async function main(): Promise<void> {
  try {
    const taskParser = new TaskParser();
    const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

    await unpackSolution({
      credentials: getCredentials(),
      environmentUrl: getEnvironmentUrl(),
      solutionZipFile: parameterMap['SolutionInputFile'],
      sourceFolder: parameterMap['SolutionTargetFolder'],
      solutionType: parameterMap['SolutionType'],
    }, runnerParameters, new BuildToolsHost());
  } catch (error) {
    const logger = runnerParameters.logger;
    logger.error(`failed: ${error}`);
  }
}
