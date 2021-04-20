import { debug, error, warning } from "azure-pipelines-task-lib";
import { Logger } from "@microsoft/powerplatform-cli-wrapper";

const logger: Logger = {
  debug: (...args: string[]) => debug(args.join(", ")),
  log: (...args: string[]) => console.log(...args),
  warn: (...args: string[]) => warning(args.join()),
  error: (...args: string[]) => error(args.join()),
};

export default logger;
