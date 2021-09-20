// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { deleteEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {
  await deleteEnvironment({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl()
  }, runnerParameters);
})();
