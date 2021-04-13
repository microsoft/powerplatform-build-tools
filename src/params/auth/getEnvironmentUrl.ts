import { getEndpointUrl } from "azure-pipelines-task-lib";
import getAuthenticationType from "./getEndpointName";

export default function getEnvironmentUrl(): string {
  const endpointName = getAuthenticationType();
  const endpointUrl = getEndpointUrl(endpointName, false);
  if (endpointUrl === undefined) {
    throw new Error(`Could not find endpoint: ${endpointName}`);
  }
  return endpointUrl;
}
