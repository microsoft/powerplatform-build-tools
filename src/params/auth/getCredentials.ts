import {
  ClientCredentials,
  UsernamePassword,
} from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization } from "azure-pipelines-task-lib";
import getEndpointName, { EndpointName } from "./getEndpointName";

export default function getCredentials(): ClientCredentials | UsernamePassword {
  const endpointName = getEndpointName();
  switch (endpointName) {
    case "PowerPlatformEnvironment":
      return getUsernamePassword();
    case "PowerPlatformSPN":
      return getClientCredentials();
  }
}

function getClientCredentials(): ClientCredentials {
  const params = getEndpointAuthorizationParameters("PowerPlatformSPN");
  return {
    tenantId: params.tenantId,
    appId: params.applicationId,
    clientSecret: params.clientSecret,
  };
}

function getUsernamePassword(): UsernamePassword {
  const params = getEndpointAuthorizationParameters("PowerPlatformEnvironment");
  return {
    username: params.username,
    password: params.password,
  };
}

function getEndpointAuthorizationParameters(
  endpointName: EndpointName
): { [key: string]: string } {
  const authorization = getEndpointAuthorization(endpointName, false);
  if (authorization === undefined) {
    throw new Error(`Could not get credentials for endpoint: ${endpointName}`);
  }
  return authorization.parameters;
}
