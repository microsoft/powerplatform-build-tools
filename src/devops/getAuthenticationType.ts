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
  return convertStringToAuthenticationType(inputValue);
}

export function convertStringToAuthenticationType(
  value: string
): AuthenticationType {
  if (value in stringAuthTypeMap) {
    return stringAuthTypeMap[value];
  } else {
    throw new Error(`Unsupported authentication type: ${value}`);
  }
}

export function convertAuthenticationTypeToString(
  authenticationType: AuthenticationType
): string {
  return authTypeStringMap[authenticationType];
}
