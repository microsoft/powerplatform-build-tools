import { getInput } from "azure-pipelines-task-lib";

export type EndpointName = "PowerPlatformEnvironment" | "PowerPlatformSPN";

export default function getAuthenticationType(): EndpointName {
  const input = getInput("authenticationType");
  assertIsEndpointName(input);
  return input;
}

function assertIsEndpointName(
  input: string | undefined
): asserts input is EndpointName {
  if (input === undefined) {
    throw new Error("authenticationType is undefined");
  }
  if (input !== "PowerPlatformEnvironment" && input !== "PowerPlatformSPN") {
    throw new Error(`Unsupported authenticationType: ${input}`);
  }
}
