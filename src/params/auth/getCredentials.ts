// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  ClientCredentials,
  UsernamePassword,
} from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization } from "azure-pipelines-task-lib";
import getAuthenticationType from "./getAuthenticationType";
import { getEndpointName } from "./getEndpointName";

export function getCredentials(): ClientCredentials | UsernamePassword {
  const authenticationType = getAuthenticationType();
  switch (authenticationType) {
    case "PowerPlatformEnvironment":
      return getUsernamePassword();
    case "PowerPlatformSPN":
      return getClientCredentials();
  }
}

function getClientCredentials(): ClientCredentials {
  const endpointName = getEndpointName("PowerPlatformSPN");
  const params = getEndpointAuthorizationParameters(endpointName);
  return {
    tenantId: params.tenantId,
    appId: params.applicationId,
    clientSecret: params.clientSecret,
  };
}

function getUsernamePassword(): UsernamePassword {
  const endpointName = getEndpointName("PowerPlatformEnvironment");
  const params = getEndpointAuthorizationParameters(endpointName);
  return {
    username: params.username,
    password: params.password,
  };
}

function getEndpointAuthorizationParameters(
  endpointName: string
): { [key: string]: string } {
  const authorization = getEndpointAuthorization(endpointName, false);
  if (authorization === undefined) {
    throw new Error(`Could not get credentials for endpoint: ${endpointName}`);
  }
  return authorization.parameters;
}
