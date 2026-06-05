// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from "azure-pipelines-task-lib/task";
import { Logger } from "@microsoft/powerplatform-cli-wrapper";

const buildToolsLogger: Logger = {
  log: (...args: string[]) => console.log(args.join()),
  warn: (...args: string[]) => tl.warning(args.join()),
  error: (...args: string[]) => tl.error(args.join()),
  debug: (...args: string[]) => tl.debug(args.join())
};

export default buildToolsLogger;
