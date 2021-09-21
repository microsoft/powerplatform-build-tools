// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { whoAmI } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { chmod } from "fs/promises";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {
  if (process.env.PP_BUILDTOOLS) {
      await main();
  }
})();

export async function main(): Promise<void> {
    await chmod(`${runnerParameters.runnersDir}/pac_linux/tools/pac`, 0o711);
    await whoAmI({
      credentials: getCredentials(),
      environmentUrl: getEnvironmentUrl()
    }, runnerParameters);
}
