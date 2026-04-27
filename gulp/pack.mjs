import fs from "fs-extra";
import createTfxRunner from "./lib/createTfxRunner.mjs";
import yargs from 'yargs';
const argv = yargs(process.argv.slice(2)).argv; // skip 'node' and 'gulp.js' args
import { createCommandRunner } from "@microsoft/powerplatform-cli-wrapper";
import find from "find";
import path from "path";
import { rm } from "fs/promises";
import { info } from "fancy-log";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const tar = require("tar");
const AdmZip = require("adm-zip");

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
  await tar.extract({
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

  // Exclude the two nested _rels/.rels files that cause ESRP vsixsigntool.exe to fail
  // with error 0x80510005. These are OPC metadata artifacts left behind when the pac CLI
  // NuGet packages are extracted — they reference non-existent targets and confuse the
  // OPC parser inside vsixsigntool.exe when it encounters them inside a VSIX (itself OPC).
  // See: ICM 779156496
  const EXCLUDED_BIN_FILES = new Set([
    path.join("pac", "_rels", ".rels"),
    path.join("pac_linux", "_rels", ".rels"),
  ]);
  const binFileFilter = (src) => {
    const rel = path.relative(binFolder, src);
    return !EXCLUDED_BIN_FILES.has(rel);
  };

  await Promise.all([
    fs.copy(binFolder, `${toolInstallerFolder}/bin`, { recursive: true, filter: binFileFilter }),
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
      stageManifest.public = true;
      stageManifest.name = `${stageManifest.name} ([${stage}] ${stageManifest.version})`;
      stageManifest.id = `${stageManifest.id}-${stage}`;
      // Make service endpoint contribution names unique per stage to avoid Marketplace collision
      stageManifest.contributions = stageManifest.contributions.map(contrib => {
        if (contrib.type === "ms.vss-endpoint.service-endpoint-type") {
          return {
            ...contrib,
            id: `${contrib.id}-${stage.toLowerCase()}`,
            properties: {
              ...contrib.properties,
              name: `${contrib.properties.name}-${stage.toLowerCase()}`,
              displayName: `${contrib.properties.displayName} [${stage}]`,
            }
          };
        }
        return contrib;
      });
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
        // Update service endpoint reference to match the stage-specific endpoint name
        if (taskJson.inputs) {
          taskJson.inputs = taskJson.inputs.map(input => {
            if (input.type && input.type.startsWith("connectedService:powerplatform-spn")) {
              return { ...input, type: `connectedService:powerplatform-spn-${stage.toLowerCase()}` };
            }
            return input;
          });
        }
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

  // Fix [Content_Types].xml in all generated VSIX files to add Override entries for
  // extension-less files inside the pac CLI directories.
  //
  // Background: VSIX files are OPC (Open Packaging Convention) containers. Every part
  // (file) inside must be covered by [Content_Types].xml — either via a <Default> entry
  // keyed on file extension, or via an <Override> entry keyed on the full part path.
  //
  // 'tfx extension create' only generates <Default> entries keyed on extensions, so any
  // extension-less file gets no entry. When the VSIX is processed by OPC-aware tools
  // (e.g. the AzDO Marketplace ingestion pipeline), any part not registered in
  // [Content_Types].xml is silently dropped from the output package.
  //
  // Known extension-less files in bin/pac* that must be preserved:
  //   bin/pac_linux/tools/pac                              — Linux PAC CLI executable
  //   bin/pac*/tools/.playwright/.../xdg-open              — used by Playwright for browser auth flows
  //   bin/pac*/tools/.playwright/.../LICENSE|NOTICE        — license text (harmless but included for completeness)
  //
  // Note: _rels/.rels files are already excluded during copyDependencies() so they never
  // reach the VSIX and do not need to be handled here.
  async function fixVsixContentTypes() {
    // Match any extension-less file inside the pac or pac_linux tool directories.
    const PAC_DIR_PATTERN = /^tasks\/tool-installer\/tool-installer-v2\/bin\/pac[^/]*\//;

    const vsixFiles = await findFiles(/\.vsix$/, packagesDir);
    for (const vsixPath of vsixFiles) {
      const zip = new AdmZip(vsixPath);
      const ctEntry = zip.getEntry('[Content_Types].xml');
      if (!ctEntry) {
        throw new Error(`[Content_Types].xml not found in ${vsixPath}`);
      }

      const ctXml = ctEntry.getData().toString('utf8');

      // Collect part paths already covered by <Override> entries (strip leading '/').
      const overridePaths = new Set(
        [...ctXml.matchAll(/PartName="([^"]+)"/g)].map(m => m[1].replace(/^\//, ''))
      );

      // Find all extension-less files inside the pac directories that are missing an Override.
      const newOverrides = [];
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const entryName = entry.entryName.replace(/\\/g, '/');
        const hasNoExtension = path.extname(entryName) === '';
        if (PAC_DIR_PATTERN.test(entryName) && hasNoExtension && !overridePaths.has(entryName)) {
          newOverrides.push(
            `  <Override ContentType="application/octet-stream" PartName="/${entryName}"/>`
          );
        }
      }

      if (newOverrides.length > 0) {
        const modified = ctXml.replace(
          '</Types>',
          newOverrides.join('\n') + '\n</Types>'
        );
        zip.updateFile('[Content_Types].xml', Buffer.from(modified, 'utf8'));
        zip.writeZip(vsixPath);
        info(
          `Fixed [Content_Types].xml in ${path.basename(vsixPath)}: ` +
          `added ${newOverrides.length} Override entr${newOverrides.length === 1 ? 'y' : 'ies'} ` +
          `(${newOverrides.map(o => /PartName="\/([^"]+)"/.exec(o)?.[1]).join(', ')})`
        );
      }
    }
  }

  await fixVsixContentTypes();
}
