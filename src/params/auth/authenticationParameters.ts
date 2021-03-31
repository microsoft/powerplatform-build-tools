import { AuthenticationParameters } from "@microsoft/powerplatform-cli-wrapper";
import getAuthenticationType from "./getAuthenticationType";
import { getClientCredentials, getUsernamePassword } from "./getCredentials";
import getEnvironment from "./getEnvironment";

const authenticationParameters: AuthenticationParameters = {
  getAuthenticationType: getAuthenticationType,
  getClientCredentials: getClientCredentials,
  getEnvironment: getEnvironment,
  getUsernamePassword: getUsernamePassword,
};

export default authenticationParameters;
