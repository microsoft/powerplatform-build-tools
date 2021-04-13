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
const { createCommandRunner } = require("@microsoft/powerplatform-cli-wrapper");
const { extract } = require("tar");
const find = require("find");
const path = require("path");

const primedExtensionDir = "out/primed-extension";

module.exports = async () => {
  const manifest = require("../extension/extension-manifest.json");

  await clean();

  await generateNpmPackage();
  await copyDependencies();
  setVersion(manifest);
  setContributions(manifest);
  await addTaskJsonFiles();
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
  await extract({
    file: `${pkgFolder}/${fileName}`,
    cwd: pkgFolder,
  });
  await copy(`${pkgFolder}/package/dist`, primedExtensionDir, {
    recursive: true,
  });
  await removeInvalidFiles();
}

async function removeInvalidFiles() {
  await new Promise((resolve) => {
    find.file(/[#^[\]<>?\s]/, `out/npm-package/package/bin`, async (files) => {
      await Promise.all(files.map((file) => rm(file)));
      resolve();
    });
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
          name: `tasks/${task.name}`,
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
          return copy(file, `${primedExtensionDir}/${relativePath}`);
        })
      );
      resolve();
    });
  });
}

async function copyDependencies() {
  const nodeModulesFolder = path.resolve(
    "out/npm-package/package/node_modules"
  );
  const binFolder = path.resolve("out/npm-package/package/bin");

  await new Promise((resolve) => {
    find.file(/tasks\/.*\/index\.js$/, primedExtensionDir, async (tasks) => {
      const copyPromises = [];
      tasks.forEach((task) => {
        const taskDir = path.dirname(task);
        copyPromises.push(
          copy(nodeModulesFolder, `${taskDir}/node_modules`, {
            recursive: true,
          }),
          copy(binFolder, `${taskDir}/bin`, { recursive: true })
        );
      });
      await Promise.all(copyPromises);
      resolve();
    });
  });
}

async function generateAllStages(manifest) {
  const compiledExtensionDir = "out/compiled-extension";
  if (existsSync(compiledExtensionDir))
    await rm(compiledExtensionDir, { recursive: true });

  const tfxRunner = createTfxRunner();

  const taskMetadata = require("../extension/task-metadata.json");

  for (const stage of ["EXPERIMENTAL"]) {
    const stageManifest = JSON.parse(JSON.stringify(manifest));
    if (stage !== "LIVE") {
      stageManifest.name = `${stageManifest.name} ([${stage}] ${stageManifest.version})`;
      stageManifest.id = `${stageManifest.id}-${stage}`;
    } else {
      stageManifest.name = `${stageManifest.name} (${stageManifest.version})`;
    }
    await new Promise((resolve) =>
      find.file(
        /task.json$/,
        `${primedExtensionDir}`,
        async (taskFileNames) => {
          await Promise.all(
            taskFileNames.map(async (taskFileName) => {
              const localTaskId = /^out\/primed-extension\/tasks\/([^/]*)/.exec(
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
