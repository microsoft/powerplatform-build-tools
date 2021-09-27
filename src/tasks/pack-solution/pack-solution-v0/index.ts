import { packSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsHost } from "../../../host/BuildToolsHost";
import { TaskParser } from "../../../parser/TaskParser";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";
import { AzurePipelineTaskDefiniton } from "../../../parser/AzurePipelineDefinitions";
import * as taskDefinitionData from "./task.json";

(async () => {
  const taskParser = new TaskParser();
  const parameterMap = taskParser.getHostParameterEntries((taskDefinitionData as unknown) as AzurePipelineTaskDefiniton);

  await packSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    solutionZipFile: parameterMap['SolutionOutputFile'],
    sourceFolder: parameterMap['SolutionSourceFolder'],
    solutionType: parameterMap['SolutionType'],
  }, runnerParameters, new BuildToolsHost());
})();
