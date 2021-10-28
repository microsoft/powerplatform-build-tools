// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { cwd } from "process";

const EnvVarPrefix = 'PowerPlatformTools_';

(async () => {
  if (process.env.PP_BUILDTOOLS) {
      await main();
  }
})().catch(err => {
  tl.error( `tool-installer failed: ${err}`);
});

export async function main(): Promise<void> {
  tl.setVariable(`${EnvVarPrefix}_pacPath`, cwd());
  console.log('TOOL INSTALLER running!!!');
}
