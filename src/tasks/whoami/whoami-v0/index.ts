// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { whoAmI } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { BuildToolsRunnerParams } from '../../../host/BuildToolsRunnerParams';

(async () => {
  if (process.env['AGENT_JOBNAME']) {
      await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  await whoAmI({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl()
  }, new BuildToolsRunnerParams());
}
