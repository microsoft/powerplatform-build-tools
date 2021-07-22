// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { getInput } from "azure-pipelines-task-lib";

export function getValidInput(name: string, required: true): string | never;
export function getValidInput(name: string, required?: boolean): string | undefined;
export function getValidInput(name: string, required?: boolean): string | undefined {
  return getInput(name, required);
}
