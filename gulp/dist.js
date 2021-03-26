const { resolve } = require("path");
const { mkdir, writeJson, pathExists, rm, copy } = require("fs-extra");
const createTfxRunner = require("./lib/createTfxRunner");
const binDir = require("./lib/binDir");

const tfxRunner = createTfxRunner();

module.exports = async () => {
  const rootDir = resolve(__dirname, "..");
  const distDir = resolve(rootDir, "dist");
  const extensionSourceFolder = resolve(rootDir, "extension");
  const manifest = require(resolve(
    extensionSourceFolder,
    "extension-manifest.json"
  ));
  const tasks = require(resolve(extensionSourceFolder, "task-metadata.json"))
    .tasks;

  manifest.contributions = tasks.map((task) => ({
    id: task.name,
    type: "ms.vss-distributed-task.task",
    targets: ["ms.vss-distributed-task.tasks"],
    properties: {
      name: "tasks/tool-installer",
    },
  }));

  const extensionBinFolder = resolve(binDir, "extension");
  if (await pathExists(extensionBinFolder)) {
    await new Promise((resolve) =>
      rm(extensionBinFolder, { recursive: true }, resolve)
    );
  }
  await mkdir(extensionBinFolder);
  await writeJson(resolve(extensionBinFolder, "vss-extension.json"), manifest, {
    spaces: 2,
  });
  await copy(
    resolve(extensionSourceFolder, "assets"),
    resolve(extensionBinFolder, "assets"),
    {
      recursive: true,
    }
  );
  await copy(
    resolve(rootDir, "README.md"),
    resolve(extensionBinFolder, "overview.md")
  );
  await tfxRunner.createExtension({
    root: extensionBinFolder,
    outputPath: resolve(distDir),
  });
};
