// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { publishSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { BuildToolsRunnerParams } from "../../../host/BuildToolsRunnerParams";
import { BuildToolsHost } from '../../../host/BuildToolsHost';
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { isRunningOnAgent } from '../../../params/auth/isRunningOnAgent';

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
    // AB#2761762
    async: { name: "async", required: false, defaultValue: undefined }
  }, new BuildToolsRunnerParams(), new BuildToolsHost());
}
