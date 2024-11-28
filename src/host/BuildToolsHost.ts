// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import fs = require("fs-extra");
import path = require("path");
import os = require("os");
import unzip = require('unzip-stream');
import * as tl from 'azure-pipelines-task-lib/task';

import { IArtifactStore } from "@microsoft/powerplatform-cli-wrapper/dist/host/IArtifactStore";
import { HostParameterEntry, IHostAbstractions } from "@microsoft/powerplatform-cli-wrapper/dist/host/IHostAbstractions";
import { getEnvironmentUrl } from "../params/auth/getEnvironmentUrl";
import buildToolsLogger from "../host/logger";

export class BuildToolsHost implements IHostAbstractions {
  name = "Build-Tools";
  private _artifactStoreName: string;

  public constructor(artifactStoreName?: string) {
    this._artifactStoreName = artifactStoreName || 'artifacts';
  }

  public getInput(entry: HostParameterEntry): string | undefined {
    if(entry.name === 'Environment')
      return getEnvironmentUrl();

    const value = tl.getInput(entry.name, entry.required);
    // normalize value to always be undefined if the user has not declared the input value
    return (value && value.trim() !== '') ? value : undefined;
  }

  public getArtifactStore(): IArtifactStore {
    return new AzDevOpsArtifactStore(this._artifactStoreName);
  }
}

class AzDevOpsArtifactStore implements IArtifactStore {
  private readonly _subFolder;
  private _hasArtifactFolder = false;
  private _resultsDirectory: string;

  public constructor(subFolder: string) {
    this._subFolder = subFolder;
    this._resultsDirectory = os.tmpdir();
  }

  public getTempFolder(): string {
    const outputDirectory = this.getOutputDirectory();
    this._resultsDirectory = path.join(outputDirectory, 'results');
    buildToolsLogger.debug(`Artifact directory: ${outputDirectory}`);
    return outputDirectory;
  }

  public async upload(artifactName: string, files: string[]): Promise<void> {
    buildToolsLogger.debug(`files: ${files.join(';')}`);
    await fs.emptyDir(this._resultsDirectory);
    await Promise.all(files.map((file) => {
      if (path.extname(file).toLowerCase() === '.zip') {
        buildToolsLogger.debug(`unzipping ${file} into ${this._resultsDirectory} ...`);
        return extractToFolder(file, this._resultsDirectory);
      } else {
        buildToolsLogger.debug(`copying ${file} into ${this._resultsDirectory} ...`);
        return fs.copyFile(file, path.join(this._resultsDirectory, path.basename(file)));
      }
    }));

    if (this._hasArtifactFolder) {
      // https://docs.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops&tabs=bash#upload-upload-an-artifact
      tl.uploadArtifact(this._subFolder, this._resultsDirectory, artifactName);
    } else {
      // pipeline has no artifact store (e.g. release pipelines):
      const resultFiles = await fs.readdir(this._resultsDirectory);
      for await (const resultFile of resultFiles) {
        const fqn = path.join(this._resultsDirectory, resultFile);
        tl.uploadFile(fqn);
      }
    }
  }

  // Establish output directory for the different pipeline runtime contexts:
  // different variables are predefined depending on type of pipeline (build vs. release) and classic vs. yaml
  // https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml#agent-variables
  private getOutputDirectory(): string {
      this._hasArtifactFolder = false;
      let baseOutDir: string;
      if (process.env.BUILD_ARTIFACTSTAGINGDIRECTORY) {
          baseOutDir = process.env.BUILD_ARTIFACTSTAGINGDIRECTORY;
          this._hasArtifactFolder = true;
      }
      else if (process.env.PIPELINE_WORKSPACE) {
          baseOutDir = process.env.PIPELINE_WORKSPACE;
      }
      else if (process.env.AGENT_BUILDDIRECTORY) {
          baseOutDir = process.env.AGENT_BUILDDIRECTORY;
      } else {
          baseOutDir = path.join(process.cwd(), 'out');
      }
      const outputDirectory = path.join(baseOutDir, this._subFolder);
      fs.emptyDirSync(outputDirectory);
      return outputDirectory;
  }
}

async function extractToFolder(zipFile: string, outDirectory: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipFile)
      .pipe(unzip.Extract({ path: outDirectory }))
      .on("close", () => {
        resolve(outDirectory);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
