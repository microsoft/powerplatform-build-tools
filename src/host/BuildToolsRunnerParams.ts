// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import fs = require('fs');
import path = require('path');
import { Logger, RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import buildToolsLogger from "./logger";

const EnvVarPrefix = 'POWERPLATFORMTOOLS_';
export const PacPathEnvVarName = `${EnvVarPrefix}PACCLIPATH`;

// Known task GUIDs for PowerPlatformToolInstaller across all release stages.
// These names select direct children of the executing bundle's trusted task cache.
const ToolInstallerTaskGuids: ReadonlyArray<string> = [
  '8015465b-f367-4ec4-8215-8edf682574d3', // LIVE
  'a4243e47-8809-429e-bda4-624757b874b5', // BETA
  'bbb104f9-1acc-4584-8b09-93b8e2373659', // DEV
  '133b55b8-c51f-4ceb-8270-6d68c0cac6e4', // EXPERIMENTAL
];

/**
 * Returns the canonical PAC directory from the executing bundle's task cache.
 * The module directory is injectable for filesystem fixtures, never from job variables.
 * Task-cache contents must already be trusted: this does not prevent same-user
 * replacement of validated files or their support files.
 */
export function validatePacPath(pacPath: string, trustedModuleDir: string = __dirname): string {
  if (process.platform !== 'win32' && process.platform !== 'linux') {
    throw pacPathValidationError(`unsupported operating system: ${process.platform}`);
  }

  requireFullyQualifiedPath(pacPath);
  requireFullyQualifiedPath(trustedModuleDir);
  const consumerTaskName = path.basename(path.dirname(trustedModuleDir));
  const consumerTaskMatch = /^[a-z][a-z0-9_]*_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.exec(consumerTaskName);
  if (!consumerTaskMatch || consumerTaskMatch[0] !== consumerTaskName ||
      !isV2TaskVersion(path.basename(trustedModuleDir))) {
    throw pacPathValidationError('the executing bundle is not in a taskName_GUID/v2-version directory');
  }

  // Deployed index.js is exactly two directories below the task-cache authority.
  const trustedCacheRoot = canonicalDirectory(path.dirname(path.dirname(trustedModuleDir)));
  const versionDirectory = path.dirname(pacPath);
  const installerDirectory = path.dirname(versionDirectory);
  const installerName = path.basename(installerDirectory);
  const version = path.basename(versionDirectory);
  const binName = path.basename(pacPath);
  const expectedInstallerName = ToolInstallerTaskGuids
    .map(guid => `PowerPlatformToolInstaller_${guid}`)
    .find(name => componentMatches(name, installerName));

  if (!expectedInstallerName || !isV2TaskVersion(version) || !componentMatches('bin', binName)) {
    throw pacPathValidationError('expected a known PowerPlatformToolInstaller_GUID/2.minor.patch/bin path');
  }

  // Resolve aliases before comparing roots, including drive/share aliases on Windows.
  const candidateCacheRoot = canonicalDirectory(path.dirname(installerDirectory));
  if (!sameDirectory(trustedCacheRoot, candidateCacheRoot)) {
    throw pacPathValidationError('the PAC directory is outside the executing bundle\'s task cache');
  }

  const installer = installationDirectory(trustedCacheRoot, expectedInstallerName);
  if (installerName !== expectedInstallerName &&
      !sameDirectory(installer, installationDirectory(trustedCacheRoot, installerName))) {
    throw pacPathValidationError('the installer name resolves to a different filesystem directory');
  }
  const installation = installationDirectory(installer, version);
  const bin = canonicalDirectory(path.join(installation, 'bin'));
  if (binName !== 'bin' && !sameDirectory(bin, canonicalDirectory(path.join(installation, binName)))) {
    throw pacPathValidationError('the bin name resolves to a different filesystem directory');
  }
  requireWithinInstallation(bin, installation);

  const platformDirectory = canonicalDirectory(path.join(bin, process.platform === 'win32' ? 'pac' : 'pac_linux'));
  requireWithinInstallation(platformDirectory, installation);
  const toolsDirectory = canonicalDirectory(path.join(platformDirectory, 'tools'));
  requireWithinInstallation(toolsDirectory, installation);
  const executable = fs.realpathSync.native(
    path.join(toolsDirectory, process.platform === 'win32' ? 'pac.exe' : 'pac')
  );
  requireWithinInstallation(path.dirname(executable), installation);
  if (!fs.statSync(executable).isFile()) {
    throw pacPathValidationError('the PAC executable is not a regular file');
  }
  if (process.platform === 'linux') {
    fs.accessSync(executable, fs.constants.X_OK);
  }
  return bin;
}

function pacPathValidationError(reason: string): Error {
  return new Error(
    `Security validation failed: ${reason}. Ensure PowerPlatformToolInstaller@2 runs before this task ` +
    `and ${PacPathEnvVarName} has not been modified by other pipeline steps.`
  );
}

function requireFullyQualifiedPath(value: string): void {
  const windows = process.platform === 'win32';
  const fullyQualified = windows
    ? /^[a-z]:[\\/]/i.test(value) || /^[/\\]{2}[^/\\]+[/\\][^/\\]+(?:[/\\]|$)/.test(value)
    : path.isAbsolute(value);
  const components = value.split(windows ? /[/\\]/ : /\//);
  if (!fullyQualified || value.indexOf('\0') !== -1 ||
      components.some(component => component === '.' || component === '..') ||
      (windows && (/^[/\\]{2}[?.][/\\]/.test(value) ||
        components.some(component => /[. ]$/.test(component))))) {
    throw pacPathValidationError('paths must be fully qualified platform paths without traversal or device namespaces');
  }
}

function isV2TaskVersion(value: string): boolean {
  const components = value.split('.');
  return components.length === 3 && components[0] === '2' &&
    components.slice(1).every(component => component.length > 0 && !/[^0-9]/.test(component));
}

function componentMatches(expected: string, supplied: string): boolean {
  // Case folding only selects an expected name; sameDirectory establishes identity.
  return process.platform === 'win32'
    ? expected.toLowerCase() === supplied.toLowerCase()
    : expected === supplied;
}

function canonicalDirectory(directory: string): string {
  const canonical = fs.realpathSync.native(directory);
  if (!fs.statSync(canonical).isDirectory()) {
    throw pacPathValidationError('a required task-cache or PAC directory is not a directory');
  }
  return canonical;
}

function installationDirectory(parent: string, name: string): string {
  const directory = path.join(parent, name);
  // Only cache-root aliases are authoritative; task/version links cannot select an installation.
  if (!fs.lstatSync(directory).isDirectory()) {
    throw pacPathValidationError('installer task and version entries must be directories, not links');
  }
  return canonicalDirectory(directory);
}

function sameDirectory(first: string, second: string): boolean {
  // BigInt preserves Windows file IDs; case-insensitive string comparison would
  // conflate distinct siblings when per-directory case sensitivity is enabled.
  const firstStat = fs.statSync(first, { bigint: true });
  const secondStat = fs.statSync(second, { bigint: true });
  if (firstStat.ino.toString() === '0' || secondStat.ino.toString() === '0') {
    throw pacPathValidationError('the filesystem does not expose a usable directory identity');
  }
  return firstStat.isDirectory() && secondStat.isDirectory() &&
    firstStat.dev === secondStat.dev && firstStat.ino === secondStat.ino;
}

function requireWithinInstallation(directory: string, installation: string): void {
  let ancestor = directory;
  while (!sameDirectory(ancestor, installation)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) {
      throw pacPathValidationError('a PAC path redirects outside the selected installer version');
    }
    ancestor = parent;
  }
}

export class BuildToolsRunnerParams implements RunnerParameters {
  private _workingDir: string;
  private _runnersDir: string | undefined;
  private _agent: string;

  public constructor() {
    this._workingDir = cwd();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jsonPackage = require("../../package.json");
    const productName = jsonPackage.name.split("/")[1];
    this._agent = `${productName}/${jsonPackage.version}`;
  }

  public get logger(): Logger {
    return buildToolsLogger;
  }

  public get runnersDir(): string {
    // lazy evaluation to determine pac CLI location from ToolInstaller task's discovery:
    if (!this._runnersDir) {
      const pacPath = tl.getVariable(PacPathEnvVarName);
      if (!pacPath) {
        if (isPPBT_v0()){
          throw new Error('It appears this pipeline was initialized with a v0 ToolInstaller task. Mixing v0 and v2 PP-BT tasks is NOT supported; please consult https://aka.ms/pp-bt-migrate-to-v2 on how to migrate to PP-BT v2.');
        } else {
          throw new Error(`Cannot find required pac CLI, Tool-Installer task was not called before this task!`);
        }
      }
      this._runnersDir = validatePacPath(pacPath);
    }
    return this._runnersDir;
  }

  public get workingDir(): string {
    return this._workingDir;
  }

  public get agent(): string {
    return this._agent;
  }

}

function isPPBT_v0(): boolean {
  // check if one of the PS modules env variables that ToolInstaller@0 set?
  return !!process.env['PowerPlatformTools_Microsoft_Xrm_WebApi_PowerShell'];
}
