// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface AzurePipelineTaskDefiniton {
  inputs: AzurePipelineTaskParameterDefiniton[];
}

// To Do - Update it based on it's actual definition from https://github.com/microsoft/azure-pipelines-task-lib/blob/master/tasks.schema.json
export interface AzurePipelineTaskParameterDefiniton {
  name: string;
  type: "string" | "boolean" | "int" | "multiline" | "secureFile" | "filePath"; // and others, and "connectedService\\:..."
  label: string;
  required?: boolean;
  defaultValue?: string | boolean;
  visibleRule?: string;
  helpMarkDown?: string;
  // and others
}
