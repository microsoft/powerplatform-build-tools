import { RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import logger from "./logger";

if (process.env.POWERPLATFORM_BUILD_TOOLS_RUNNERS_DIR === undefined) {
  throw new Error(
    "Tool Installer must be run before running any other Power Platform tools."
  );
}

const runnerParameters: RunnerParameters = {
  runnersDir: process.env.POWERPLATFORM_BUILD_TOOLS_RUNNERS_DIR,
  workingDir: cwd(),
  logger: logger,
};

export default runnerParameters;
