// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { publishSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { isRunningOnAgent } from '../../../params/auth/isRunningOnAgent';
import { BuildToolsHost } from "../../../host/BuildToolsHost";

(async () => {
  if (isRunningOnAgent()) {
      await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});


export async function main(): Promise<void> {
  await publishSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
