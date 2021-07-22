// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { exportSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { runnerParameters } from "../../../params/runnerParameters";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { getSolutionName, getSolutionPath } from "../../../params/solutionParameters";

(async () => {
  exportSolution({
    name: getSolutionName(),
    path: getSolutionPath("SolutionOutputFile"),
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
  }, runnerParameters);
})();
