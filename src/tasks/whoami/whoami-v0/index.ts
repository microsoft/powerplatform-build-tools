import { whoAmI } from "@microsoft/powerplatform-cli-wrapper";
import authenticationParameters from "../../../devops/auth/authenticationParameters";
import runnerParameters from "../../../devops/runnerParameters";

whoAmI({
  ...authenticationParameters,
  ...runnerParameters,
});
