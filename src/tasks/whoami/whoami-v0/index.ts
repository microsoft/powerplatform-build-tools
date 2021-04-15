import { whoAmI } from "@microsoft/powerplatform-cli-wrapper";
import getCredentials from "../../../params/auth/getCredentials";
import getEnvironmentUrl from "../../../params/auth/getEnvironmentUrl";
import runnerParameters from "../../../params/runnerParameters";

whoAmI({
  credentials: getCredentials(),
  environmentUrl: getEnvironmentUrl(),
  ...runnerParameters,
});
