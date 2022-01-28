import { getInput } from "azure-pipelines-task-lib";
import { AuthenticationType } from "./getAuthenticationType";

export function getEndpointName(
  authenticationType: AuthenticationType
): string {
  const endpointName = getInput(authenticationType);
  if (endpointName === undefined) {
    throw new Error(`End Point Name for ${authenticationType} is undefined`);
  }
  return endpointName;
}
