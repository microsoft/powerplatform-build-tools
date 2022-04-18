// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import semver = require('semver');

const agentVersion = tl.getVariable('Agent.Version') || '1.95.0'; // assume lowest agent version from task.json files
const hasTaskVars = semver.lt(agentVersion, '2.115.0');

// for backwards compat, keep env var names the same as what shipped in PS implementation:
// see: https://dev.azure.com/dynamicscrm/OneCRM/_git/PowerApps.AzDevOpsExtensions?path=/src/extension/common/PipelineVariables.ps1
export const EnvUrlVariableName = "BuildTools.EnvironmentUrl";
export const EnvIdVariableName = "BuildTools.EnvironmentId";

export function SetTaskOutputVariable(varName: string, value: string): void {
  tl.setVariable(varName, value, false, true);
}

export function GetPipelineVariable(varName: string): string | undefined {
  let value;
  if (hasTaskVars) {
    // NOTE: tl.getTaskVariable is only supported on newer agents >= 2.115.0, but our task.json still allow for agents 1.9.x
    value = tl.getTaskVariable(varName);
  }
  // try looking for plain pipeline variable:
  if (!value) {
    value = tl.getVariable(varName);
  }
  return value;
}

export function GetPipelineOutputVariable(varName: string): [string | undefined, string | undefined] {
  let value = GetPipelineVariable(varName);
  if (!value) {
    // now try different specific task sources of ours, starting with the CreateEnvironment task:
    const ppbtTaskOutVarOrigins = [ 'PowerPlatformCreateEnvironment', 'PowerPlatformCopyEnvironment',
     'PowerPlatformResetEnvironment', 'PowerPlatformRestoreEnvironment' ];

    for (const taskName of ppbtTaskOutVarOrigins) {
      const canonicalVarName = varName.replace(/\./g, '_').replace(/-/g, '_');
      value = tl.getVariable(`${taskName}_${canonicalVarName}`);
      if (value) {
        return [value, taskName];
      }
    }
  }
  return [value, undefined];
}

export function IsolateVariableReference(refExpression: string): [string, boolean] {
  const extractVarNameRegex = /\$\((\S+)\)/gm;
  const m = extractVarNameRegex.exec(refExpression);
  const isRefExpression = m !== null;
  const result = (isRefExpression) ? m[1] : refExpression;
  tl.debug(`IsolateVarRef: ${refExpression} -> ${result} (isRefExpression=${isRefExpression})`);
  return [result, isRefExpression];
}
