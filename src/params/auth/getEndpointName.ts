import { getInput } from "azure-pipelines-task-lib";
import { AuthenticationType } from "./getAuthenticationType";

export function getEndpointName(
  authenticationType: AuthenticationType
): string {
  const endpointName = getInput(authenticationType);
  if (endpointName === undefined) {
    throw new Error(`${endpointName} is undefined`);
  }
  return endpointName;
}
