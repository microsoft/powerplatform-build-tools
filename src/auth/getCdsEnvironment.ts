import { CdsEnvironment } from "@microsoft/powerplatform-cli-wrapper";
import { getEndpointUrl } from "azure-pipelines-task-lib";
import AuthenticationType from "./AuthenticationType";

export default function getCdsEnvironment(
  authenticationType: AuthenticationType
): CdsEnvironment {
  const url = getEndpointUrl(authenticationType, false);
  if (url === undefined) {
    throw new Error("Could not get url for PowerPlatformEnvironment endpoint.");
  }
  return { envUrl: url };
}
