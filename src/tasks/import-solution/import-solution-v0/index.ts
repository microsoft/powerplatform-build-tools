// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { importSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { runnerParameters } from "../../../params/runnerParameters";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { getSolutionPath } from "../../../params/solutionParameters";

(async () => {
  importSolution({
    path: getSolutionPath("SolutionInputFile"),
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
  }, runnerParameters);
})();
