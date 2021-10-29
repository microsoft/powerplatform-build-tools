// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { chmod } from "fs/promises";
import path = require('path');
import { pathExists } from 'fs-extra';

export async function findPacCLI(): Promise<string> {
  let pacPath = path.resolve(__dirname, 'bin');
  switch (process.platform) {
    case 'win32':
      pacPath = path.resolve(pacPath, 'pac', 'tools', 'pac.exe');
      break;
    case 'linux':
      pacPath = path.resolve(pacPath, 'pac_linux', 'tools', 'pac');
      await chmod(pacPath, 0o711);
      break;
    default:
      throw new Error(`Unsupported OS for tool-installer: ${process.platform}`);
  }
  if (!await pathExists(pacPath)) {
    throw new Error(`Cannot find required pac CLI executable under: ${pacPath}`);
  }
  return pacPath;
}
