import {
  AuthenticationType,
  ClientCredentials,
  UsernamePassword,
} from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization } from "azure-pipelines-task-lib";
import { convertAuthenticationTypeToString } from "./getAuthenticationType";

export function getClientCredentials(): ClientCredentials {
  const params = getEndpointAuthorizationParameters(
    AuthenticationType.ClientCredentials
  );
  return {
    tenantId: params.tenantId,
    appId: params.applicationId,
    clientSecret: params.clientSecret,
  };
}

export function getUsernamePassword(): UsernamePassword {
  const params = getEndpointAuthorizationParameters(
    AuthenticationType.UsernamePassword
  );
  return {
    username: params.username,
    password: params.password,
  };
}

function getEndpointAuthorizationParameters(
  authenticationType: AuthenticationType
): { [key: string]: string } {
  const endpointName = convertAuthenticationTypeToString(authenticationType);
  const authorization = getEndpointAuthorization(endpointName, false);
  if (authorization === undefined) {
    throw new Error(`Could not get credentials for endpoint: ${endpointName}`);
  }
  return authorization.parameters;
}
