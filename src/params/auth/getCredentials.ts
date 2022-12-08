// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { URL } from 'url';
import { ClientCredentials, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import { EndpointAuthorization, getEndpointAuthorization, getEndpointUrl } from "azure-pipelines-task-lib";
import { getAuthenticationType, AuthenticationType } from "./getAuthenticationType";
import { getEndpointName } from "./getEndpointName";


export function getCredentials(defaultAuthType?: AuthenticationType): ClientCredentials | UsernamePassword {
  const authenticationType = getAuthenticationType(defaultAuthType);
  switch (authenticationType) {
    case "PowerPlatformEnvironment":
      return getUsernamePassword();
    case "PowerPlatformSPN":
      return getClientCredentials();
  }
}

function getClientCredentials(): ClientCredentials {
  const endpointName = getEndpointName("PowerPlatformSPN");
  const authorization = getEndpointAuthorizationParameters(endpointName);
  return {
    tenantId: authorization.parameters.tenantId,
    appId: authorization.parameters.applicationId,
    clientSecret: authorization.parameters.clientSecret,
    encodeSecret: true,
    cloudInstance: resolveCloudInstance(endpointName),
    scheme: authorization.scheme
  };
}

function getUsernamePassword(): UsernamePassword {
  const endpointName = getEndpointName("PowerPlatformEnvironment");
  const authorization = getEndpointAuthorizationParameters(endpointName);
  return {
    username: authorization.parameters.username,
    password: authorization.parameters.password,
    encodePassword: true,
    cloudInstance: resolveCloudInstance(endpointName)
  };
}

function getEndpointAuthorizationParameters(
  endpointName: string
): EndpointAuthorization {
  const authorization = getEndpointAuthorization(endpointName, false);
  if (authorization === undefined) {
    throw new Error(`Could not get credentials for endpoint: ${endpointName}`);
  }
  return authorization;
}

// needed for backwards compatibility to the PS implementation:
// infer the cloudInstance from the default endpoint url on the service connection
// see Get-Origin in https://dev.azure.com/dynamicscrm/OneCRM/_git/PowerApps.AzDevOpsExtensions?path=/src/extension/common/SharedFunctions.psm1&version=GBmaster&line=23&lineEnd=24&lineStartColumn=1&lineEndColumn=1&lineStyle=plain&_a=contents
function resolveCloudInstance(endpointName: string): string {
  const defaultEndpointUrl = getEndpointUrl(endpointName, true);
  if (!defaultEndpointUrl) {
    return "Public";
  }
  const hostname = new URL(defaultEndpointUrl)
    .hostname
    .split('.')
    .reverse();
  hostname.splice(-1);
  const regionalized = hostname.reverse().join('.');

  // see also:
  // https://docs.microsoft.com/en-us/power-platform/admin/new-datacenter-regions
  // https://dev.azure.com/dynamicscrm/OneCRM/_git/CRM.DevToolsCore?path=%2Fsrc%2FGeneralTools%2FDataverseClient%2FClient%2FModel%2FDiscoveryServers.cs&_a=contents&version=GBmaster
  switch (regionalized) {
    case 'crm.dynamics.com':
    case 'crm2.dynamics.com':
    case 'crm3.dynamics.com':
    case 'crm4.dynamics.com':
    case 'crm5.dynamics.com':
    case 'crm6.dynamics.com':
    case 'crm7.dynamics.com':
    case 'crm8.dynamics.com':
    case 'crm11.dynamics.com':
    case 'crm12.dynamics.com':
    case 'crm14.dynamics.com':
    case 'crm15.dynamics.com':
    case 'crm16.dynamics.com':
    case 'crm17.dynamics.com':
    case 'crm19.dynamics.com':
    case 'crm20.dynamics.com':
    case 'crm21.dynamics.com':
      return "Public";
    case 'crm9.dynamics.com':
      return "UsGov";
    case 'crm.microsoftdynamics.us':
      return "UsGovHigh";
    case 'crm.appsplatform.us':
      return "UsGovDod";
    case 'crm.dynamics.cn':
      return "Mooncake";
    case 'crm10.dynamics.com':
      return "Tip1";
    case 'crmtest.dynamics.com':
      return "Tip2";
    default:
      return "Public";
  }
}
