import { ClientCredentials } from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization } from "azure-pipelines-task-lib";
import AuthenticationType from "./AuthenticationType";

export default function getClientCredentials(): ClientCredentials {
  const authorization = getEndpointAuthorization(
    AuthenticationType.ClientCredentials,
    false
  );
  if (authorization === undefined) {
    throw new Error(
      `Could not get credentials for endpoint: ${AuthenticationType.ClientCredentials}`
    );
  }
  return {
    tenantId: authorization.parameters.tenantId,
    appId: authorization.parameters.applicationId,
    clientSecret: authorization.parameters.clientSecret,
  };
}
