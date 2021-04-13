const {
  mkdir,
  writeJson,
  pathExists,
  rm,
  copy,
  existsSync,
  stat,
  write,
  writeFile,
} = require("fs-extra");
const createTfxRunner = require("./lib/createTfxRunner");
const { argv } = require("process");
const { ArgumentParser } = require("argparse");
const { createCommandRunner } = require("@microsoft/powerplatform-cli-wrapper");
const { extract } = require("tar");
const find = require("find");
const path = require("path");

const primedExtensionDir = "out/primed-extension";

module.exports = async () => {
  const manifest = require("../extension/extension-manifest.json");

  await clean();

  await generateNpmPackage();
  setVersion(manifest);
  setContributions(manifest);
  await addTaskJsonFiles();
  await removeInvalidFiles();
  await copy("extension/assets", `${primedExtensionDir}/assets`, {
    recursive: true,
  });
  await copy("README.md", `${primedExtensionDir}/overview.md`);

  await generateAllStages(manifest);
};

async function clean() {
  if (await pathExists(primedExtensionDir)) {
    await new Promise((resolve) =>
      rm(primedExtensionDir, { recursive: true }, resolve)
    );
  }
  await mkdir(primedExtensionDir, { recursive: true });
}

async function generateNpmPackage() {
  const pkgFolder = "out/npm-package";
  if (existsSync(pkgFolder)) await rm(pkgFolder, { recursive: true });
  await mkdir(pkgFolder);

  const npm = createCommandRunner(pkgFolder, "npm", console);
  const results = await npm("pack", "../..");
  const fileName = results[0];
  console.log(`extracting ${pkgFolder}/${fileName}`);
  await extract({
    file: `${pkgFolder}/${fileName}`,
    cwd: primedExtensionDir,
  });
}

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
    ...tasks
      .filter((task) => existsSync(`src/tasks/${task.name}`))
      .map((task) => ({
        id: task.name,
        type: "ms.vss-distributed-task.task",
        targets: ["ms.vss-distributed-task.tasks"],
        properties: {
          name: task.name,
          uri: "package/dist/tasks",
        },
      })),
    ...serviceConnections,
  ];
}

async function addTaskJsonFiles() {
  await new Promise((resolve) => {
    find.file(/tasks\/.*\/task.json$/, "src", async (files) => {
      await Promise.all(
        files.map((file) => {
          const relativePath = file.replace(/src\//, "");
          return copy(
            file,
            `${primedExtensionDir}/package/dist/${relativePath}`
          );
        })
      );
      resolve();
    });
  });
}

async function removeInvalidFiles() {
  await new Promise((resolve) => {
    find.file(
      /[#^[\]<>?\s]/,
      `${primedExtensionDir}/package/bin`,
      async (files) => {
        await Promise.all(files.map((file) => rm(file)));
        resolve();
      }
    );
  });
}

async function generateAllStages(manifest) {
  const compiledExtensionDir = "out/compiled-extension";
  if (existsSync(compiledExtensionDir))
    await rm(compiledExtensionDir, { recursive: true });

  const tfxRunner = createTfxRunner();

  const taskMetadata = require("../extension/task-metadata.json");

  for (const stage of ["LIVE", "BETA", "DEV", "EXPERIMENTAL"]) {
    const stageManifest = JSON.parse(JSON.stringify(manifest));
    if (stage !== "LIVE") {
      stageManifest.id = `${stageManifest.id}-${stage}`;
    }
    await new Promise((resolve) =>
      find.file(
        /task.json$/,
        `${primedExtensionDir}/package/dist`,
        async (taskFileNames) => {
          await Promise.all(
            taskFileNames.map(async (taskFileName) => {
              const localTaskId = /^out\/primed-extension\/package\/dist\/tasks\/([^/]*)/.exec(
                taskFileName
              )[1];
              const taskJson = require(path.resolve(taskFileName));
              taskJson.id = taskMetadata.tasks.find(
                (t) => t.name === localTaskId
              ).id[stage];
              await writeJson(taskFileName, taskJson, {
                spaces: 2,
              });
            })
          );
          resolve();
        }
      )
    );
    await writeJson(`${primedExtensionDir}/vss-extension.json`, stageManifest, {
      spaces: 2,
    });
    await generateVsix();
  }

  async function generateVsix() {
    await tfxRunner.createExtension({
      root: primedExtensionDir,
      outputPath: compiledExtensionDir,
    });
  }
}
