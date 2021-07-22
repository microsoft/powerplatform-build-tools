import { error, debug, warning } from "azure-pipelines-task-lib";
import { Logger } from "@microsoft/powerplatform-cli-wrapper";

const logger: Logger = {
  log: (...args: string[]) => console.log(args),
  warn: (...args: string[]) => warning(args.join()),
  error: (...args: string[]) => error(args.join()),
  debug: (...args: string[]) => debug(args.join())
};

export default logger;
