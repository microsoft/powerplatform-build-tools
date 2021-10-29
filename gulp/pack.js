const { mkdir, writeJson, pathExists, copy, existsSync } = require("fs-extra");
const createTfxRunner = require("./lib/createTfxRunner");
const { argv } = require("process");
const { ArgumentParser } = require("argparse");
const { createCommandRunner } = require("@microsoft/powerplatform-cli-wrapper");
const { extract: extractTar } = require("tar");
const find = require("find");
const path = require("path");
const { rm } = require("fs/promises");

const outDir = 'out';
const stagingDir = `${outDir}/staging`;
const npmPackageDir = `${outDir}/npm-package`;
const packagesDir = `${outDir}/packages`;

module.exports = async () => {
  const manifest = require("../extension/extension-manifest.json");

  await createDir(outDir);
  await createDir(stagingDir);

  await generateNpmPackage();
  await copyDependencies();
  await removeInvalidFiles();
  setVersion(manifest);
  setContributions(manifest);
  await addTaskFiles();
  await copy("extension/assets", `${stagingDir}/assets`, {
    recursive: true,
  });
  await copy("README.md", `${stagingDir}/overview.md`);

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

  const pkgNames = results
    .map(line => line.replace(/\n$/, ''))
    .filter(line => line.match(/^\s*microsoft\S+\.tgz$/));

  if (pkgNames.length !== 1) {
    throw new Error(`Cannot find package name, got this result from 'npm pack': (${pkgNames.length}) - ${pkgNames.join('; ')}`);
  }
  const fileName = path.resolve(npmPackageDir, pkgNames[0]);
  console.log(`>> packaged as: ${fileName}`);

  const pkgRoot = path.resolve(npmPackageDir, 'package');
  await extractTar({
    file: fileName,
    cwd: npmPackageDir,
  });

  await copy(pkgRoot, stagingDir, {
    recursive: true,
  });
}

async function removeInvalidFiles() {
  const files = await findFiles(/[#^[\]<>?\s]/, stagingDir);
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

async function addTaskFiles() {
  const filesToCopy = []
    .concat(await findFiles(/tasks[\/\\].*[\/\\]task.json$/, "src"))
    .concat(await findFiles(/tasks[\/\\].*[\/\\]index.js$/, "dist/src"));

  await Promise.all(
    filesToCopy.map((file) => {
      const relativePath = file
        .replace(/src[\/\\]/, "")
        .replace(/dist[\/\\]/, "");
      return copy(file, `${stagingDir}/${relativePath}`);
    })
  );
}

async function copyDependencies() {
  const nodeModulesFolder = path.resolve(
    `${npmPackageDir}/package/node_modules`
  );
  const binFolder = path.resolve("bin");
  const toolInstallerFolder = `${stagingDir}/tasks/tool-installer/tool-installer-v0`;

  await Promise.all([
    copy(nodeModulesFolder, `${toolInstallerFolder}/node_modules`, {
      recursive: true,
    }),
    copy(binFolder, `${toolInstallerFolder}/bin`, { recursive: true }),
  ]);
}

async function generateAllStages(manifest) {
  if (existsSync(packagesDir))
    await rm(packagesDir, { recursive: true });

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
    const taskJsonFiles = await findFiles(/task.json$/, stagingDir);
    await Promise.all(
      taskJsonFiles.map(async (file) => {
        const taskName = /^out[\/\\]staging[\/\\]tasks[\/\\]([^/\\]*)/.exec(
          file
        )[1];
        const taskJson = require(path.resolve(file));
        const taskInfo = taskMetadata.tasks.find((t) => t.name === taskName);
        if (!taskInfo) {
          throw new Error(`Cannot find task id for taskname ${taskName} in file ${path.resolve('../extension/task-metadata.json')}`);
        }
        taskJson.id = taskInfo.id[stage];
        await writeJson(file, taskJson, {
          spaces: 2,
        });
      })
    );
    await writeJson(`${stagingDir}/vss-extension.json`, stageManifest, {
      spaces: 2,
    });
    await generateVsix();
  }

  async function generateVsix() {
    await tfxRunner.createExtension({
      root: stagingDir,
      outputPath: packagesDir,
    });
  }
}
