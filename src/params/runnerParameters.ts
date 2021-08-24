// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { resolve } from "path";
import { cwd } from "process";
import logger from "./logger";

export const runnerParameters: Readonly<RunnerParameters> = {
  runnersDir: resolve(__dirname, "bin"),
  workingDir: cwd(),
  logger: logger,
};
