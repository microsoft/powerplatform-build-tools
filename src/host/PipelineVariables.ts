// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import semver = require('semver');
import { log } from '../params/auth/getEnvironmentUrl';

const agentVersion = tl.getVariable('Agent.Version') || '1.95.0'; // assume lowest agent version from task.json files
const hasTaskVars = semver.lt(agentVersion, '2.115.0');

// for backwards compat, keep env var names the same as what shipped in PS implementation:
// see: https://dev.azure.com/dynamicscrm/OneCRM/_git/PowerApps.AzDevOpsExtensions?path=/src/extension/common/PipelineVariables.ps1
const VariableNamePrefix = "BuildTools.";
export const EnvUrlVariableName = `${VariableNamePrefix}EnvironmentUrl`;
export const EnvIdVariableName = `${VariableNamePrefix}EnvironmentId`;
export const ApplicationIdlVariableName = `${VariableNamePrefix}ApplicationId`;
export const ClientSecretVariableName = `${VariableNamePrefix}ClientSecret`;
export const TenantIdVariableName = `${VariableNamePrefix}TenantId`;
export const DataverseConnectionStringVariableName = `${VariableNamePrefix}DataverseConnectionString`;
export const UserNameVariableName = `${VariableNamePrefix}UserName`;
export const PasswordVariableName = `${VariableNamePrefix}Password`;

export interface EnvironmentParams {
  value : string | undefined;
  taskName : string | undefined;
}

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

export function GetPipelineOutputVariable(varName: string): EnvironmentParams {
  let envParams : EnvironmentParams = {
    value: undefined,
    taskName: undefined
  };

  let value = GetPipelineVariable(varName);
  if(value) {
    //Prioritise pipeline variable
    envParams.value = value;
    return envParams;
  }

  //If pipeline variable isn't found then pick task output variable in this order -> restore > reset > copy > create
  const ppbtTaskOutVarOrigins = [ 'PowerPlatformCreateEnvironment', 'PowerPlatformCopyEnvironment',
    'PowerPlatformResetEnvironment', 'PowerPlatformRestoreEnvironment' ];
  let outputVariableCounter = 0;

  for (const taskName of ppbtTaskOutVarOrigins) {
    const canonicalVarName = varName.replace(/\./g, '_').replace(/-/g, '_');
    value = tl.getVariable(`${taskName}_${canonicalVarName}`);
    if (value) {
      envParams.taskName = taskName;
      envParams.value = value;
      outputVariableCounter++;
    }
  }

  if(outputVariableCounter>1) {
    log(`Multiple Values found in task output variables, picking (${envParams.taskName}): ${envParams.value}`);
  }

  return envParams;
}

export function IsolateVariableReference(refExpression: string): [string, boolean] {
  const extractVarNameRegex = /\$\((\S+)\)/gm;
  const m = extractVarNameRegex.exec(refExpression);
  const isRefExpression = m !== null;
  const result = (isRefExpression) ? m[1] : refExpression;
  tl.debug(`IsolateVarRef: ${refExpression} -> ${result} (isRefExpression=${isRefExpression})`);
  return [result, isRefExpression];
}
