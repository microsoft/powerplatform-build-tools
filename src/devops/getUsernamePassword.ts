import { UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization } from "azure-pipelines-task-lib";
import AuthenticationType from "./AuthenticationType";

export default function getUsernamePassword(): UsernamePassword {
  const authorization = getEndpointAuthorization(
    AuthenticationType.UsernamePassword,
    false
  );
  if (authorization === undefined) {
    throw new Error(
      `Could not get credentials for endpoint: ${AuthenticationType.UsernamePassword}`
    );
  }
  return {
    username: authorization.parameters.username,
    password: authorization.parameters.password,
  };
}
