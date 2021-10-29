// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { whoAmI } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { BuildToolsRunnerParams } from '../../../host/BuildToolsRunnerParams';

const runner = new BuildToolsRunnerParams();

(async () => {
  if (process.env['Agent.JobName']) {
      await main();
  }
})().catch(error => {
  const logger = runner.logger;
  logger.error(`failed: ${error}`);
});

export async function main(): Promise<void> {
    await whoAmI({
      credentials: getCredentials(),
      environmentUrl: getEnvironmentUrl()
    }, runner);
}
