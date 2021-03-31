import { whoAmI } from "@microsoft/powerplatform-cli-wrapper";
import authenticationParameters from "../../../params/auth/authenticationParameters";
import runnerParameters from "../../../params/runnerParameters";

whoAmI({
  ...authenticationParameters,
  ...runnerParameters,
});
