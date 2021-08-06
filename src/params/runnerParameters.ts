// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import ActionLogger from "./logger";

export const runnerParameters: Readonly<RunnerParameters> = {
  runnersDir: cwd() + "/bin",
  workingDir: cwd(),
  logger: new ActionLogger(),
};
