// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { findPacCLIPath } from '../../../host/CliLocator';
import { PacPathEnvVarName } from '../../../host/BuildToolsRunnerParams';

(async () => {
  if (process.env['AGENT_JOBNAME']) {
    await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  const addToolsToPath = tl.getInputRequired('AddToolsToPath').toLowerCase() === 'true';
  const { pacRootPath, pacPath } = await findPacCLIPath();

  tl.debug(`Found required pac CLI executable under: ${pacRootPath}`);
  tl.debug(`Setting ${PacPathEnvVarName} : ${pacRootPath}`);
  if (addToolsToPath) {
    tl.prependPath(pacPath);
  }
  tl.setVariable(PacPathEnvVarName, pacRootPath);
}

