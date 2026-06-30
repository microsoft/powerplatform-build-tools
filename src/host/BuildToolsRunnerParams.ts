// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import path = require('path');
import { realpathSync } from 'fs';
import { Logger, RunnerParameters } from "@microsoft/powerplatform-cli-wrapper";
import { cwd } from "process";
import buildToolsLogger from "./logger";

const EnvVarPrefix = 'POWERPLATFORMTOOLS_';
export const PacPathEnvVarName = `${EnvVarPrefix}PACCLIPATH`;

// Known task GUIDs for PowerPlatformToolInstaller across all release stages.
// The PAC CLI binary is only installed by this task, so a valid PAC path must
// reside under a directory named with one of these GUIDs.
const ToolInstallerTaskGuids: ReadonlyArray<string> = [
  '8015465b-f367-4ec4-8215-8edf682574d3', // LIVE
  'a4243e47-8809-429e-bda4-624757b874b5', // BETA
  'bbb104f9-1acc-4584-8b09-93b8e2373659', // DEV
  '133b55b8-c51f-4ceb-8270-6d68c0cac6e4', // EXPERIMENTAL
];

/** Normalizes a path for case-insensitive, forward-slash prefix/substring comparison. */
function normalizeForCompare(p: string): string {
  return path.resolve(p).toLowerCase().replace(/\\/g, '/');
}

/**
 * Determines whether `pacPath` resides under the agent's `_tasks` directory.
 *
 * A plain substring check for `/_tasks/` is not sufficient on agents that cache
 * downloaded tasks in a separate folder and expose it through a `_tasks`
 * symbolic link. Node resolves a running task's `__dirname` (and therefore the
 * PAC path that the ToolInstaller derives from it) to the real, symlink-resolved
 * location, which no longer contains a literal `_tasks` segment. To handle that,
 * when the literal check fails we resolve the agent's genuine `_tasks` directory
 * through any symlinks and verify the PAC path lives under its real location.
 */
function isUnderAgentTasksDir(pacPath: string): boolean {
  const normalizedPath = normalizeForCompare(pacPath);

  // Fast path: the conventional, non-symlinked layout.
  if (normalizedPath.includes('/_tasks/')) {
    return true;
  }

  // Symlink-aware fallback: compare against the real location of the agent's
  // own `_tasks` directory. AGENT_WORKFOLDER is set by the trusted agent, so an
  // attacker cannot redirect it; the GUID check below remains the strong guard.
  const workFolder = process.env['AGENT_WORKFOLDER'] || process.env['AGENT_ROOTDIRECTORY'];
  if (!workFolder) {
    return false;
  }
  try {
    const realTasksDir = normalizeForCompare(realpathSync(path.join(workFolder, '_tasks')));
    let realPacPath: string;
    try {
      realPacPath = normalizeForCompare(realpathSync(pacPath));
    } catch {
      // PAC path may not exist on disk (e.g. during validation-only checks);
      // fall back to its normalized form so a symlinked _tasks still matches.
      realPacPath = normalizedPath;
    }
    return realPacPath === realTasksDir || realPacPath.startsWith(`${realTasksDir}/`);
  } catch {
    // _tasks directory could not be resolved (missing or unreadable); reject.
    return false;
  }
}

/**
 * Validates that a PAC CLI path originates from the official ToolInstaller task directory.
 * This prevents a low-trust build step from redirecting protected tasks to an
 * attacker-controlled PAC binary by overwriting the job-scoped PACCLIPATH variable.
 */
export function validatePacPath(pacPath: string): void {
  const normalizedPath = normalizeForCompare(pacPath);

  // The path must be under the agent's _tasks directory (resolving symlinks if needed)
  if (!isUnderAgentTasksDir(pacPath)) {
    throw new Error(
      `Security validation failed: PAC CLI path "${pacPath}" is not under the agent's _tasks directory. ` +
      `The PAC CLI must be resolved from the official PowerPlatformToolInstaller task. ` +
      `Ensure that PowerPlatformToolInstaller@2 runs before this task and that ` +
      `the ${PacPathEnvVarName} variable has not been modified by other pipeline steps.`
    );
  }

  // The path must contain one of the known ToolInstaller task GUIDs
  const hasValidGuid = ToolInstallerTaskGuids.some(guid =>
    normalizedPath.includes(`/powerplatformtoolinstaller_${guid}`)
  );
  if (!hasValidGuid) {
    throw new Error(
      `Security validation failed: PAC CLI path "${pacPath}" does not reference a known ` +
      `PowerPlatformToolInstaller task GUID. The PAC CLI must be executed from the official ` +
      `ToolInstaller task directory. Ensure that ${PacPathEnvVarName} has not been tampered with.`
    );
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
      validatePacPath(pacPath);
      this._runnersDir = pacPath;
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
