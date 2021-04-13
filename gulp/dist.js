const {
  mkdir,
  writeJson,
  pathExists,
  rm,
  copy,
  existsSync,
} = require("fs-extra");
const createTfxRunner = require("./lib/createTfxRunner");

const { argv } = require("process");
const { ArgumentParser } = require("argparse");

module.exports = async () => {
  const manifest = require("../extension/extension-manifest.json");

  setVersion(manifest);
  setContributions(manifest);

  await generateVsix(manifest);
};

function setVersion(manifest) {
  const currentVersionParts = manifest.version.split(".");
  const [currentMajor, currentMinor, currentPatch] = currentVersionParts;

  const parser = new ArgumentParser();
  parser.add_argument("--major", {
    type: "int",
    default: currentMajor,
  });
  parser.add_argument("--minor", {
    type: "int",
    default: currentMinor,
  });
  parser.add_argument("--patch", {
    type: "int",
    default: currentPatch,
  });
  const { major, minor, patch } = parser.parse_args(argv.slice(3));

  manifest.version = `${major}.${minor}.${patch}`;
}

function setContributions(manifest) {
  const tasks = require("../extension/task-metadata.json").tasks;
  const serviceConnections = require("../extension/service-connections.json")
    .contributions;

  manifest.contributions = [
    ...tasks.map((task) => ({
      id: task.name,
      type: "ms.vss-distributed-task.task",
      targets: ["ms.vss-distributed-task.tasks"],
      properties: {
        name: task.name,
      },
    })),
    ...serviceConnections,
  ];
}

async function generateVsix(manifest) {
  const tfxRunner = createTfxRunner();

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
  if (existsSync("dist")) rm("dist", { recursive: true });
  await tfxRunner.createExtension({
    root: bin,
    outputPath: "dist",
  });
}
