// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface AzurePipelineTaskDefiniton {
  inputs: AzurePipelineTaskParameterDefiniton[];
}

// Definition from https://github.com/microsoft/azure-pipelines-task-lib/blob/master/tasks.schema.json
export interface AzurePipelineTaskParameterDefiniton {
  name: string;
  type: "string" | "boolean" | "filePath";
  label: string;
  required?: boolean;
  defaultValue?: string | boolean;
  visibleRule?: string;
  helpMarkDown?: string;
}
