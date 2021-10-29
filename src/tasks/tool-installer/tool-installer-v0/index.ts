// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import path = require('path');
import { findPacCLI } from '../../../host/CliLocator';
import { PacPathEnvVarName } from '../../../host/BuildToolsRunnerParams';

(async () => {
  if (process.env.PP_BUILDTOOLS) {
      await main();
  }
})().catch(err => {
  tl.error( `tool-installer failed: ${err}`);
});

export async function main(): Promise<void> {
  const pacPath = await findPacCLI();

  tl.debug(`Found required pac CLI executable under: ${pacPath}`);
  tl.setVariable(PacPathEnvVarName, path.dirname(pacPath));
}

