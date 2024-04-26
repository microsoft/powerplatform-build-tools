// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { URL } from 'url';
import { UsernamePassword, AuthCredentials } from "@microsoft/powerplatform-cli-wrapper";
import { EndpointAuthorization, getEndpointAuthorization, getEndpointUrl } from "azure-pipelines-task-lib";
import { getAuthenticationType, AuthenticationType } from "./getAuthenticationType";
import { getEndpointName } from "./getEndpointName";


export function getCredentials(defaultAuthType?: AuthenticationType): AuthCredentials {
  const authenticationType = getAuthenticationType(defaultAuthType);
  switch (authenticationType) {
    case "PowerPlatformEnvironment":
      return getUsernamePassword();
    case "PowerPlatformSPN":
      return getClientCredentials();
  }
}

function getClientCredentials(): AuthCredentials {
  const endpointName = getEndpointName("PowerPlatformSPN");
  const authorization = getEndpointAuthorizationParameters(endpointName);

  tl.debug("Auth Scheme: " + authorization.scheme);

  if (authorization.scheme === "WorkloadIdentityFederation") {
    // Set environment variables for Workload Identity Federation
    tl.debug('Acquiring Workload Identity Federation details from pipeline service connection');
    process.env.PAC_ADO_ID_TOKEN_REQUEST_URL = buildIdTokenRequestUrl();

    const pipelineAuth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
    if (pipelineAuth && pipelineAuth.scheme === 'OAuth') {
        tl.debug('Pipeline connection found with OAuth scheme');
        process.env.PAC_ADO_ID_TOKEN_REQUEST_TOKEN = pipelineAuth.parameters['AccessToken'];
        tl.setSecret(process.env.PAC_ADO_ID_TOKEN_REQUEST_TOKEN); // Mask in logs, though that *should* already be done.
    } else {
        tl.warning('Could not find pipeline connection details. Workload Identity Federation may not work as expected.');
    }

    return {
      tenantId: authorization.parameters.tenantid,
      appId: authorization.parameters.serviceprincipalid,
      cloudInstance: resolveCloudInstance(endpointName),
      scheme: authorization.scheme,
      federationProvider: "AzureDevOps"
    };
  }

  return {
    tenantId: authorization.parameters.tenantId,
    appId: authorization.parameters.applicationId,
    clientSecret: authorization.parameters.clientSecret,
    encodeSecret: true,
    cloudInstance: resolveCloudInstance(endpointName),
    scheme: authorization.scheme
  };
}

// Docs: https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/oidctoken/create?view=azure-devops-rest-7.2
function buildIdTokenRequestUrl(): string {
  const oidcApiVersion = '7.2-preview.1';
  const projectId = tl.getVariable('System.TeamProjectId');
  const hub = tl.getVariable("System.HostType");
  const planId = tl.getVariable('System.PlanId');
  const jobId = tl.getVariable('System.JobId');
  const serviceConnectionId = tl.getInput("PowerPlatformSPN", true);
  let uri = tl.getVariable("System.CollectionUri");
  if (!uri) {
      uri = tl.getVariable("System.TeamFoundationServerUri");
  }

  const tokenRequestUrl = `${uri}${projectId}/_apis/distributedtask/hubs/${hub}/plans/${planId}/jobs/${jobId}/oidctoken?serviceConnectionId=${serviceConnectionId}&api-version=${oidcApiVersion}`;
  tl.debug(`OIDC Token Request URL: ${tokenRequestUrl}`);
  return tokenRequestUrl;
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
      return "China";
    case 'crm10.dynamics.com':
      return "Preprod";
    case 'crmtest.dynamics.com':
      return "Test";
    default:
      return "Public";
  }
}
