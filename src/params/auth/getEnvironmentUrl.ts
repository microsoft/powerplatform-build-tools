// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import getAuthenticationType from './getAuthenticationType';
import { getEndpointName } from './getEndpointName';
import { EnvironmentParams, EnvUrlVariableName, GetPipelineOutputVariable, IsolateVariableReference } from '../../host/PipelineVariables';


export function getEnvironmentUrl(): string {
  const explicitEnvInputParamName = 'Environment';
  let variableName = EnvUrlVariableName;

  // try reading the optional, but explicit task input parameter "Environment"
  let endpointUrl = tl.getInput(explicitEnvInputParamName, false);
  if (endpointUrl) {
    log(`Discovered environment url from explicit input parameter '${explicitEnvInputParamName}': ${endpointUrl}`);
    let varReferenceCandidate: string;
    let isRefExpr: boolean;
    // eslint-disable-next-line prefer-const
    [varReferenceCandidate, isRefExpr] = IsolateVariableReference(endpointUrl);
    if (isRefExpr) {
      variableName = varReferenceCandidate;
      log(`Discovered Azure DevOps variable expression that needs resolving: ${endpointUrl} -> ${variableName}`);
      endpointUrl = undefined;
    } else {
      endpointUrl = varReferenceCandidate;
    }
  }

  // try finding the environment url that should be used for the calling task in this order:
  // - check for pipeline/task variables (typically set by e.g. createEnv task)
  if (!endpointUrl) {
    const envParams : EnvironmentParams = GetPipelineOutputVariable(variableName);
    endpointUrl = envParams.value;
    const taskName: string | undefined = envParams.taskName;
    if (endpointUrl) {
      if (taskName) {
        log(`Discovered environment url as task output variable (${taskName} - ${variableName}): ${endpointUrl}`);
      } else {
        log(`Discovered environment url as pipeline/task variable (${variableName}): ${endpointUrl}`);
      }
    }
  }

  // - try named OS environment variable:
  if (!endpointUrl) {
    endpointUrl = process.env[variableName];
    if (endpointUrl) {
      log(`Discovered environment url as OS environment variable (${variableName}): ${endpointUrl}`);
    }
  }

  // - finally, fall back to use the env url that is part of the Azure DevOps service connection (i.e. called endpoint in the SDK here)
  if (!endpointUrl) {
    endpointUrl = readEnvUrlFromServiceConnection();
    log(`Falling back to url from service connection, using: ${endpointUrl}`);
  }
  return endpointUrl;
}

export function readEnvUrlFromServiceConnection(): string {
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

export function log(message: string): void {
    console.log(message);
    tl.debug(message);
}
