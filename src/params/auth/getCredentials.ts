// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ClientCredentials, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointAuthorization, getEndpointUrl } from "azure-pipelines-task-lib";
import { getAuthenticationType, AuthenticationType } from "./getAuthenticationType";
import { getEndpointName } from "./getEndpointName";
import * as tl from 'azure-pipelines-task-lib/task';

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
  const params = getEndpointAuthorizationParameters(endpointName);
  return {
    tenantId: params.tenantId,
    appId: params.applicationId,
    clientSecret: params.clientSecret,
    cloudInstance: tl.getInput("Cloud", false) ?? resolveCloudInstance(endpointName)
  }
}

function getUsernamePassword(): UsernamePassword {
  const endpointName = getEndpointName("PowerPlatformEnvironment");
  const params = getEndpointAuthorizationParameters(endpointName);
  return {
    username: params.username,
    password: params.password,
    cloudInstance: tl.getInput("Cloud", false) ?? resolveCloudInstance(endpointName)
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

/**
 * @note Required for backwards compatibility to the PS implementation:
 *       Infer the cloudInstance from the default endpoint url on the service connection
 *       see Get-Origin in https://dev.azure.com/dynamicscrm/OneCRM/_git/PowerApps.AzDevOpsExtensions?path=/src/extension/common/SharedFunctions.psm1&version=GBmaster&line=23&lineEnd=24&lineStartColumn=1&lineEndColumn=1&lineStyle=plain&_a=contents
 */
function resolveCloudInstance(endpointName: string): string {
  tl.debug(`Cloud not specified, falling back to inferring cloud instance using endpoint: ${endpointName}`);
  const defaultEndpointUrl = getEndpointUrl(endpointName, true);
  if (!defaultEndpointUrl) {
    return "Public";
  }
  const regionalized = extractDomain(defaultEndpointUrl);
  // see also:
  // https://docs.microsoft.com/en-us/power-platform/admin/new-datacenter-regions
  // https://dev.azure.com/dynamicscrm/OneCRM/_git/CRM.DevToolsCore?path=%2Fsrc%2FGeneralTools%2FDataverseClient%2FClient%2FModel%2FDiscoveryServers.cs&_a=contents&version=GBmaster
  switch (regionalized) {
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

function extractDomain(endpointUrl: string) {
  const hostname = new URL(endpointUrl)
    .hostname
    .split('.')
    .reverse();
  hostname.splice(-1);
  const regionalized = hostname.reverse().join('.');
  return regionalized;
}

