import task = require("azure-pipelines-task-lib/task");
import { Logger } from "@microsoft/powerplatform-cli-wrapper";

export class ActionLogger implements Logger {
  info(...args: string[]): void {
    task.debug(args.join());
  }

  warn(...args: string[]): void {
    task.debug(args.join());
  }

  error(...args: string[]): void {
    task.error(args.join());
  }
}
