// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export function isRunningOnAgent(): boolean {
  return !!process.env['AGENT_JOBNAME'];
}
