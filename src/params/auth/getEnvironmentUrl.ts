// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { getEndpointUrl } from "azure-pipelines-task-lib";
import getAuthenticationType from "./getAuthenticationType";
import { getEndpointName } from "./getEndpointName";

export function getEnvironmentUrl(): string {
  const authenticationType = getAuthenticationType();
  const endpointName = getEndpointName(authenticationType);
  const endpointUrl = getEndpointUrl(endpointName, false);
  if (endpointUrl === undefined) {
    throw new Error(`Could not find endpoint: ${endpointName}`);
  }
  return endpointUrl;
}
