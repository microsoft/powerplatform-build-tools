// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { findPacCLI } from '../../../host/CliLocator';
import { PacPathEnvVarName } from '../../../host/BuildToolsRunnerParams';

(async () => {
  if (process.env['AGENT_JOBNAME']) {
      await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  const pacPath = await findPacCLI();

  tl.debug(`Found required pac CLI executable under: ${pacPath}`);
  tl.debug(`Setting ${PacPathEnvVarName} : ${pacPath}`);
  tl.prependPath(pacPath);
  tl.setVariable(PacPathEnvVarName, pacPath);
}

