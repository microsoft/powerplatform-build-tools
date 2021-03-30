import task = require("azure-pipelines-task-lib/task");
import { PacRunner } from "@microsoft/powerplatform-cli-wrapper";
import createAzurePipelinesPacRunner from "../../../createAzurePipelinesPacRunner";
import authenticateCds from "../../../auth/authenticateCds";

export async function run(pacFactory: () => PacRunner): Promise<void> {
  try {
    const pac = pacFactory();
    await authenticateCds(pac);
    await pac.whoAmI();
  } catch (error) {
    if (error instanceof Error) {
      task.setResult(task.TaskResult.Failed, `${error.message}`);
      console.error(error.stack);
    } else {
      task.setResult(task.TaskResult.Failed, `${error.message}`);
    }
  }
}

run(() => createAzurePipelinesPacRunner());
