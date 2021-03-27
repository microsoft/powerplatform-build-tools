const pslist = require("ps-list");
const log = require("fancy-log");
const process = require("process");
const { emptyDir } = require("fs-extra");

module.exports = async function clean() {
  (await pslist())
    .filter((info) => info.name.startsWith("pacTelemetryUpload"))
    .forEach((info) => {
      log.info(`Terminating: ${info.name} - ${info.pid}...`);
      process.kill(info.pid);
    });
  await Promise.all(["dist", "out", "bin"].map((dir) => emptyDir(dir)));
};
