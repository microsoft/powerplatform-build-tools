// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import getAuthenticationType from './getAuthenticationType';
import { getEndpointName } from './getEndpointName';
import { EnvUrlVariableName } from '../../host/PipelineVariables';


export function getEnvironmentUrl(): string {
  // try to fetch environment ( id or url ) from customer
  let endpointUrl = tl.getInput('Environment', false);
  if (endpointUrl) {
    console.log(`Fetched environment url from customer: ${endpointUrl}`);
    tl.debug(`Discovered environment url from customer: ${endpointUrl}`);
  }

  // try finding the environment url that should be used for the calling task in this order:
  // - check for pipeline/task variables (typically set by e.g. createEnv task)
  if (!endpointUrl) {
    endpointUrl = tl.getVariable(EnvUrlVariableName);
  }
  if (!endpointUrl) {
    endpointUrl = tl.getTaskVariable(EnvUrlVariableName);
  }
  if (endpointUrl) {
    console.log(`Discovered environment url as pipeline/task variable (${EnvUrlVariableName}): ${endpointUrl}`);
    tl.debug(`Discovered environment url as pipeline/task variable (${EnvUrlVariableName}): ${endpointUrl}`);
  } else {
    endpointUrl = process.env[EnvUrlVariableName];
  }
  if (endpointUrl) {
    console.log(`Discovered environment url as OS environment variable (${EnvUrlVariableName}): ${endpointUrl}`);
    tl.debug(`Discovered environment url as OS environment variable (${EnvUrlVariableName}): ${endpointUrl}`);
  }

  // - finally, fall back to use the env url that is part of the Azure DevOps service connection (i.e. called endpoint in the SDK here)
  if (!endpointUrl) {
    endpointUrl = readEnvUrlFromServiceConnection();
    console.log(`Falling back to url from service connection: ${endpointUrl}`);
    tl.debug(`Falling back to url from service connection: ${endpointUrl}`);
  }
  return endpointUrl;
}

function readEnvUrlFromServiceConnection(): string {
  const authenticationType = getAuthenticationType();
  const endpointName = getEndpointName(authenticationType);
  if (!endpointName) {
    throw new Error(`Could not find endpoint: ${endpointName} for authentication type: ${authenticationType}`);
  }

  const url = tl.getEndpointUrl(endpointName, false);
  if (!url) {
    throw new Error(`Could not find endpoint url for: ${endpointName}`);
  }
  return url;
}
