import { RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { resolve } from "path";
import { cwd } from "process";
import logger from "./logger";

const runnerParameters: RunnerParameters = {
  getRunnersDir: () => resolve("..", "..", "..", "bin"),
  getWorkingDir: () => cwd(),
  logger: logger,
};

export default runnerParameters;
