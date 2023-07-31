// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { whoAmI } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { BuildToolsRunnerParams } from '../../../host/BuildToolsRunnerParams';
import { EnvIdVariableName } from "../../../host/PipelineVariables";
import { BuildToolsHost } from "../../../host/BuildToolsHost";

(async () => {
  if (isRunningOnAgent()) {
    await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  const isDiagnosticsMode = tl.getVariable('agent.diagnostic');

  const result = await whoAmI({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    logToConsole: isDiagnosticsMode ? true : false
  }, new BuildToolsRunnerParams(), new BuildToolsHost());

  tl.setVariable(EnvIdVariableName, result.environmentId!);
}
