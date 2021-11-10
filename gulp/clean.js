// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const pslist = require("ps-list");
const log = require("fancy-log");
const process = require("process");
const { emptyDir } = require("fs-extra");

exports.killUploaderProcess = killUploaderProcess;
exports.clean = clean;

async function clean() {
  await killUploaderProcess();
  await Promise.all(["dist", "out", "bin"].map((dir) => emptyDir(dir)));
}

async function killUploaderProcess() {
  (await pslist())
    .filter((info) => info.name.startsWith("pacTelemetryUpload"))
    .forEach((info) => {
      log.info(`Terminating: ${info.name} - ${info.pid}...`);
      process.kill(info.pid);
    });
}

