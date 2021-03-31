import { Environment } from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointUrl } from "azure-pipelines-task-lib";
import getAuthenticationType, {
  convertAuthenticationTypeToString,
} from "./getAuthenticationType";

export default function getEnvironment(): Environment {
  const endpointName = convertAuthenticationTypeToString(
    getAuthenticationType()
  );
  const endpointUrl = getEndpointUrl(endpointName, false);
  if (endpointUrl === undefined) {
    throw new Error(`Could not find endpoint: ${endpointName}`);
  }
  return {
    url: endpointUrl,
  };
}
