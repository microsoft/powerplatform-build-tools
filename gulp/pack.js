const { mkdir, writeJson, pathExists, copy, existsSync } = require("fs-extra");
const createTfxRunner = require("./lib/createTfxRunner");
const { argv } = require("process");
const { ArgumentParser } = require("argparse");
const { createCommandRunner } = require("@microsoft/powerplatform-cli-wrapper");
const { extract: extractTar } = require("tar");
const find = require("find");
const path = require("path");
const { rm } = require("fs/promises");

const primedExtensionDir = "out/primed-extension";
const npmPackageDir = "out/npm-package";

module.exports = async () => {
  const manifest = require("../extension/extension-manifest.json");

  await createDir(primedExtensionDir);

  await generateNpmPackage();
  await copyDependencies();
  await removeInvalidFiles();
  setVersion(manifest);
  setContributions(manifest);
  await addTaskJsonFiles();
  await copy("extension/assets", `${primedExtensionDir}/assets`, {
    recursive: true,
  });
  await copy("README.md", `${primedExtensionDir}/overview.md`);

  await generateAllStages(manifest);
};

async function createDir(dirName) {
  if (await pathExists(dirName)) {
    await rm(dirName, { recursive: true });
  }
  await mkdir(dirName, { recursive: true });
}

async function generateNpmPackage() {
  await createDir(npmPackageDir);

  const npm = createCommandRunner(path.resolve(npmPackageDir), "npm", console, {
    shell: true,
  });
  const results = await npm("pack", "../..");
  const fileName = results.reverse().find((line) => /[^\s]/g.test(line));

  await extractTar({
    file: `${npmPackageDir}/${fileName}`,
    cwd: npmPackageDir,
  });

  await copy(`${npmPackageDir}/package/dist`, primedExtensionDir, {
    recursive: true,
  });
}

async function removeInvalidFiles() {
  const files = await findFiles(/[#^[\]<>?\s]/, primedExtensionDir);
  await Promise.all(files.map((file) => rm(file)));
}

async function findFiles(search, root) {
  return new Promise((resolve) => {
    find.file(search, root, (files) => {
      resolve(files);
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
  const taskJsonFiles = await findFiles(/tasks[\/\\].*[\/\\]task.json$/, "src");
  await Promise.all(
    taskJsonFiles.map((file) => {
      const relativePath = file.replace(/src[\/\\]/, "");
      return copy(file, `${primedExtensionDir}/${relativePath}`);
    })
  );
}

async function copyDependencies() {
  const nodeModulesFolder = path.resolve(
    `${npmPackageDir}/package/node_modules`
  );
  const binFolder = path.resolve("bin");
  const toolInstallerFolder = `${primedExtensionDir}/tasks/tool-installer/tool-installer-v0`;

  await Promise.all([
    copy(nodeModulesFolder, `${toolInstallerFolder}/node_modules`, {
      recursive: true,
    }),
    copy(binFolder, `${toolInstallerFolder}/bin`, { recursive: true }),
  ]);
}

const compiledExtensionDir = "out/compiled-extension";
async function generateAllStages(manifest) {
  if (existsSync(compiledExtensionDir))
    await rm(compiledExtensionDir, { recursive: true });

  const tfxRunner = createTfxRunner();

  const taskMetadata = require("../extension/task-metadata.json");

  for (const stage of ["LIVE", "BETA", "DEV", "EXPERIMENTAL"]) {
    const stageManifest = JSON.parse(JSON.stringify(manifest));
    if (stage !== "LIVE") {
      stageManifest.name = `${stageManifest.name} ([${stage}] ${stageManifest.version})`;
      stageManifest.id = `${stageManifest.id}-${stage}`;
    } else {
      stageManifest.name = `${stageManifest.name} (${stageManifest.version})`;
    }
    const taskJsonFiles = await findFiles(/task.json$/, primedExtensionDir);
    await Promise.all(
      taskJsonFiles.map(async (file) => {
        const taskName = /^out[\/\\]primed-extension[\/\\]tasks[\/\\]([^/\\]*)/.exec(
          file
        )[1];
        const taskJson = require(path.resolve(file));
        taskJson.id = taskMetadata.tasks.find((t) => t.name === taskName).id[
          stage
        ];
        await writeJson(file, taskJson, {
          spaces: 2,
        });
      })
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
