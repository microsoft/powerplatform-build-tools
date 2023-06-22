// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import pslist from "ps-list";
import { info as _info } from "fancy-log";
import { kill } from "process";
import { emptyDir } from "fs-extra";

export async function clean() {
  await killUploaderProcess();
  await Promise.all(["dist", "out", "bin"].map((dir) => emptyDir(dir)));
}

export async function killUploaderProcess() {
  (await pslist())
    .filter((info) => info.name.startsWith("pacTelemetryUpload"))
    .forEach((info) => {
      _info(`Terminating: ${info.name} - ${info.pid}...`);
      kill(info.pid);
    });
}

