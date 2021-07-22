// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { getValidInput } from "./getValidInput";
import { cwd } from "azure-pipelines-task-lib";
import path = require('path');

export function getSolutionName(): string {
  const solutionName = getValidInput("SolutionName", true);
  return solutionName;
}

export function getSolutionPath(solutionFilePath: string): string {
  const workingDir = cwd();
  const outputFileCandidate = getValidInput(solutionFilePath, true);
  const outputFile = path.resolve(workingDir, outputFileCandidate);
  return outputFile;
}
