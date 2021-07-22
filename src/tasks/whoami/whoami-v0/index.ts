import { whoAmI } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { chmod } from "fs/promises";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {
  await chmod(`${runnerParameters.runnersDir}/pac_linux/tools/pac`, 0o711);
  whoAmI({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl()
  }, runnerParameters);
})();
