// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { deleteEnvironment } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {
  if (isRunningOnAgent()) {
    await main();
  }
})();

export async function main(): Promise<void> {
  try {
    await deleteEnvironment({
      credentials: getCredentials(),
      environmentUrl: getEnvironmentUrl()
    }, runnerParameters);
  } catch (error) {
    const logger = runnerParameters.logger;
    logger.error(`failed: ${error}`);
  }
}
