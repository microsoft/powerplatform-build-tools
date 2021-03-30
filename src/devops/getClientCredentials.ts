import {
  AuthenticationType,
  ClientCredentials,
} from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization } from "azure-pipelines-task-lib";
import { convertAuthenticationTypeToString } from "./getAuthenticationType";

export default function getClientCredentials(): ClientCredentials {
  const endpointName = convertAuthenticationTypeToString(
    AuthenticationType.ClientCredentials
  );
  const authorization = getEndpointAuthorization(endpointName, false);
  if (authorization === undefined) {
    throw new Error(`Could not get credentials for endpoint: ${endpointName}`);
  }
  return {
    tenantId: authorization.parameters.tenantId,
    appId: authorization.parameters.applicationId,
    clientSecret: authorization.parameters.clientSecret,
  };
}
