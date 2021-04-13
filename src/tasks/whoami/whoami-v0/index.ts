import { whoAmI } from "@microsoft/powerplatform-cli-wrapper";
import { chmod } from "fs";
import getCredentials from "../../../params/auth/getCredentials";
import getEnvironmentUrl from "../../../params/auth/getEnvironmentUrl";
import runnerParameters from "../../../params/runnerParameters";

chmod(`${runnerParameters.runnersDir}/pac_linux/tools/pac`, 0o711, () => {
  whoAmI({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    ...runnerParameters,
  });
});
