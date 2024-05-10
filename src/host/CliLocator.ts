// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import path = require('path');
import { pathExists, chmod } from 'fs-extra';

export async function findPacCLI(): Promise<string> {
  // cli-wrapper expects the root folder, see: src\pac\createPacRunner.ts
  return (await findPacCLIPath()).pacRootPath;
}

export async function findPacCLIPath(): Promise<{ pacRootPath: string, pacPath: string }> {
  const pacRootPath = path.resolve(__dirname, 'bin');
  let pacPath: string;
  switch (process.platform) {
    case 'win32':
      pacPath = path.resolve(pacRootPath, 'pac', 'tools', 'pac.exe');
      break;
    case 'linux':
      pacPath = path.resolve(pacRootPath, 'pac_linux', 'tools', 'pac');
      await chmod(pacPath, 0o711);
      break;
    default:
      throw new Error(`Unsupported OS for tool-installer: ${process.platform}`);
  }
  if (!await pathExists(pacPath)) {
    throw new Error(`Cannot find required pac CLI executable under: ${pacPath}`);
  }

  pacPath = pacPath.replace(/(\/|\\)(pac.exe|pac)$/, '');

  return { pacRootPath, pacPath };
}
