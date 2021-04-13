import { error, warning, debug } from "azure-pipelines-task-lib";
import { Logger } from "@microsoft/powerplatform-cli-wrapper";

const logger: Logger = {
  info: (...args: string[]) => console.log(args),
  warn: (...args: string[]) => warning(args.join()),
  error: (...args: string[]) => error(args.join()),
};

export default logger;
