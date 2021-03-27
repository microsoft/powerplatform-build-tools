const { mkdir, writeJson, pathExists, rm, copy } = require("fs-extra");
const createTfxRunner = require("./lib/createTfxRunner");

const manifest = require("../extension/extension-manifest.json");
const tasks = require("../extension/task-metadata.json").tasks;
const serviceConnections = require("../extension/service-connections.json")
  .contributions;

module.exports = async () => {
  const tfxRunner = createTfxRunner();

  manifest.contributions = [
    ...tasks.map((task) => ({
      id: task.name,
      type: "ms.vss-distributed-task.task",
      targets: ["ms.vss-distributed-task.tasks"],
      properties: {
        name: "tasks/tool-installer",
      },
    })),
    ...serviceConnections,
  ];

  const bin = "bin/extension";
  if (await pathExists(bin)) {
    await new Promise((resolve) => rm(bin, { recursive: true }, resolve));
  }
  await mkdir(bin, { recursive: true });
  await writeJson(`${bin}/vss-extension.json`, manifest, {
    spaces: 2,
  });
  await copy("extension/assets", `${bin}/assets`, {
    recursive: true,
  });
  await copy("README.md", `${bin}/overview.md`);
  await tfxRunner.createExtension({
    root: bin,
    outputPath: "dist",
  });
};
