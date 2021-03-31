import { AuthenticationType } from "@microsoft/powerplatform-cli-wrapper";
import { getInput } from "azure-pipelines-task-lib";

const stringAuthTypeMap = new Map([
  ["PowerPlatformEnvironment", AuthenticationType.UsernamePassword],
  ["PowerPlatformSPN", AuthenticationType.ClientCredentials],
]);
const authTypeStringMap = new Map(
  [...stringAuthTypeMap.entries()].map((entry) => [entry[1], entry[0]])
);

export default function getAuthenticationType(): AuthenticationType {
  const inputValue = getInput("authenticationType");
  if (inputValue === undefined) {
    throw new Error("authenticationType is undefined");
  }
  return convertStringToAuthenticationType(inputValue);
}

export function convertStringToAuthenticationType(
  value: string
): AuthenticationType {
  const authType = stringAuthTypeMap.get(value);
  if (authType === undefined) {
    throw new Error(`Unsupported authentication type: ${value}`);
  }
  return authType;
}

export function convertAuthenticationTypeToString(
  authenticationType: AuthenticationType
): string {
  const value = authTypeStringMap.get(authenticationType);
  if (value === undefined) {
    throw new Error(`Unsupported authentication type: ${authenticationType}`);
  }
  return value;
}
