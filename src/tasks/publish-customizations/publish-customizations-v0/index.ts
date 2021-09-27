// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { publishSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {
  await publishSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
  }, runnerParameters);
})();
