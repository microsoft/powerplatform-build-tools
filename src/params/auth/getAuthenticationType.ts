import { getInput } from "azure-pipelines-task-lib";

export type AuthenticationType =
  | "PowerPlatformEnvironment"
  | "PowerPlatformSPN";

export default function getAuthenticationType(): AuthenticationType {
  const authenticationType = getInput("authenticationType");
  assertIsEndpointName(authenticationType);
  return authenticationType;
}

function assertIsEndpointName(
  input: string | undefined
): asserts input is AuthenticationType {
  if (input === undefined) {
    throw new Error("authenticationType is undefined");
  }
  if (input !== "PowerPlatformEnvironment" && input !== "PowerPlatformSPN") {
    throw new Error(`Unsupported authenticationType: ${input}`);
  }
}
