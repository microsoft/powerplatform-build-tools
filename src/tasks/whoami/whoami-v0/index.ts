import tl = require("azure-pipelines-task-lib/task");
import { PacRunner } from "@microsoft/powerplatform-cli-wrapper";
import { AuthHandler } from "../../../auth/authHandler";
import createCliWrapperPacAuthenticator from "../../../auth/createCliWrapperPacAuthenticator";
import createAzurePipelinesPacRunner from "../../../createAzurePipelinesPacRunner";

export async function run(pacFactory: () => PacRunner): Promise<void> {
  try {
    // If all tasks allow same auth types this needs to be made generic
    const authenticationType: string = tl.getInput(
      "authenticationType",
      true
    ) as string;

    const pac = pacFactory();
    const authenticator = createCliWrapperPacAuthenticator(pac);
    await new AuthHandler(authenticator).authenticate(authenticationType);

    await pac.whoAmI();
  } catch (error) {
    if (error instanceof Error) {
      tl.setResult(tl.TaskResult.Failed, `${error.message}`);
      console.error(error.stack);
    } else {
      tl.setResult(tl.TaskResult.Failed, `${error.message}`);
    }
  }
}

run(() => createAzurePipelinesPacRunner());
