import task = require("azure-pipelines-task-lib/task");
import { Logger } from "@microsoft/powerplatform-cli-wrapper";

const logger: Logger = {
  info: (...args: string[]) => task.debug(args.join()),
  warn: (...args: string[]) => task.debug(args.join()),
  error: (...args: string[]) => task.error(args.join()),
};

export default logger;
