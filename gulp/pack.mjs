import fs from "fs-extra";
import createTfxRunner from "./lib/createTfxRunner.mjs";
import yargs from 'yargs';
const argv = yargs(process.argv.slice(2)).argv; // skip 'node' and 'gulp.js' args
import { createCommandRunner } from "@microsoft/powerplatform-cli-wrapper";
import tar from "tar";
import find from "find";
import path from "path";
import { rm } from "fs/promises";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const outDir = 'out';
const stagingDir = `${outDir}/staging`;
const npmPackageDir = `${outDir}/npm-package`;
const packagesDir = `${outDir}/packages`;
const isOfficial = argv.isOfficial || false;

export default async () => {
  const packageJson = require("../package.json");
  const manifest = require("../extension/extension-manifest.json");

  await createDir(outDir);
  await createDir(stagingDir);

  await generateNpmPackage();
  await copyDependencies();
  await removeInvalidFiles();
  const taskVersion = setVersion(packageJson, manifest);
  setContributions(manifest);
  await addTaskFiles();
  await fs.copy("extension/assets", `${stagingDir}/assets`, {
    recursive: true,
  });

  await generateAllStages(manifest, taskVersion, manifest.version);
};

async function createDir(dirName) {
  if (await fs.pathExists(dirName)) {
    await rm(dirName, { recursive: true });
  }
  await fs.mkdir(dirName, { recursive: true });
}

async function generateNpmPackage() {
  await createDir(npmPackageDir);

  const npm = createCommandRunner(path.resolve(npmPackageDir), "npm", console, 'gulp', {
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
  await tar.extract.extractTar({
    file: fileName,
    cwd: npmPackageDir,
  });

  await fs.copy(pkgRoot, stagingDir, {
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

function setVersion(packageJson, manifest) {
  const currentVersionParts = packageJson.version.split(".");
  const [currentMajor, currentMinor, currentPatch] = currentVersionParts;

  const major = argv.major || currentMajor;
  const minor = argv.minor || currentMinor;
  const patch = argv.patch || currentPatch;

  const version = `${major}.${minor}.${patch}`;
  packageJson.version = version;
  manifest.version = version;

  return {
    major: major,
    minor: minor,
    patch: patch
  }
}

function setContributions(manifest) {
  const tasks = require("../extension/task-metadata.json").tasks;
  const serviceConnections = require("../extension/service-connections.json")
    .contributions;

  manifest.contributions = [
    ...tasks
      .filter((task) => fs.existsSync(`src/tasks/${task.name}`))
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
    .concat(await findFiles(/tasks[/\\].*[/\\]task.json$/, "src"))
    .concat(await findFiles(/tasks[/\\].*[/\\]icon.png$/, "src"))
    .concat(await findFiles(/tasks[/\\].*[/\\]index.js$/, "dist"));

  await Promise.all(
    filesToCopy.map((file) => {
      const relativePath = file
        .replace(/src[/\\]/, "")
        .replace(/dist[/\\]/, "");
      return fs.copy(file, `${stagingDir}/${relativePath}`);
    })
  );
}

async function copyDependencies() {
  const binFolder = path.resolve("bin");
  const toolInstallerFolder = `${stagingDir}/tasks/tool-installer/tool-installer-v2`;

  await Promise.all([
    fs.copy(binFolder, `${toolInstallerFolder}/bin`, { recursive: true }),
  ]);
}

function updateOverview(overviewFile, versionString) {
  const versionPlaceholder = '{{NextReleaseVersion}}';

  const overview = fs.readFileSync(overviewFile, { encoding: 'utf-8' });
  fs.writeFileSync(overviewFile, overview.replace(versionPlaceholder, versionString));
}

async function generateAllStages(manifest, taskVersion, manifestVersion) {
  if (fs.existsSync(packagesDir))
    await rm(packagesDir, { recursive: true });

  const tfxRunner = createTfxRunner();

  const taskMetadata = require("../extension/task-metadata.json");
  const overviewFile = `${stagingDir}/overview.md`;

  const taskJsonFiles = (await findFiles(/task.json$/, stagingDir))
  .map(file => {
    const taskJson = require(path.resolve(file));
    return {
      file: file,
      json: taskJson
    }
  });

  let stages = ["LIVE", "BETA", "DEV", "EXPERIMENTAL"];
  if (!isOfficial) {
    stages = stages.slice(2); // local builds create EXP and DEV packages
  }
  for (const stage of stages) {
    const stageManifest = {...manifest};
    if (stage !== "LIVE") {
      stageManifest.public = false;
      stageManifest.name = `${stageManifest.name} ([${stage}] ${stageManifest.version})`;
      stageManifest.id = `${stageManifest.id}-${stage}`;
    } else {
      stageManifest.public = true;
      stageManifest.name = `${stageManifest.name} (${stageManifest.version})`;
    }

    taskJsonFiles.map((entry) => {
      const taskName = /^out[/\\]staging[/\\]tasks[/\\]([^/\\]*)/.exec(
        entry.file
      )[1];
      const taskJson = {...entry.json};
      const taskInfo = taskMetadata.tasks.find((t) => t.name === taskName);
      if (!taskInfo) {
        throw new Error(`Cannot find task id for taskname ${taskName} in file ${path.resolve('../extension/task-metadata.json')}`);
      }
      taskJson.id = taskInfo.id[stage];
      if (stage !== "LIVE") {
        taskJson.friendlyName += ` [${stage}]`;
      }
      taskJson.version.Major = taskVersion.major;
      taskJson.version.Minor = taskVersion.minor;
      taskJson.version.Patch = taskVersion.patch;

      fs.writeJsonSync(entry.file, taskJson, {
        spaces: 2,
      });
    })

    fs.writeJsonSync(`${stagingDir}/vss-extension.json`, stageManifest, {
      spaces: 2,
    });

    await fs.copy("extension/overview.md", overviewFile);
    updateOverview(overviewFile, manifestVersion);

    await generateVsix();
  }

  async function generateVsix() {
    await tfxRunner.createExtension({
      root: stagingDir,
      outputPath: packagesDir,
    });
  }
}
