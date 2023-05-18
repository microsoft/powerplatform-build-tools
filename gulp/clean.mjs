// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import pslist from "ps-list";
import { info as _info } from "fancy-log";
import { kill } from "process";
import { emptyDir } from "fs-extra";

const _killUploaderProcess = killUploaderProcess;
export { _killUploaderProcess as killUploaderProcess };
const _clean = clean;
export { _clean as clean };

async function clean() {
  await killUploaderProcess();
  await Promise.all(["dist", "out", "bin"].map((dir) => emptyDir(dir)));
}

async function killUploaderProcess() {
  (await pslist())
    .filter((info) => info.name.startsWith("pacTelemetryUpload"))
    .forEach((info) => {
      _info(`Terminating: ${info.name} - ${info.pid}...`);
      kill(info.pid);
    });
}

