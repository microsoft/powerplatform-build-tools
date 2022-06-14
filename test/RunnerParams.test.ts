// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should } from "chai";
import { BuildToolsRunnerParams, PacPathEnvVarName } from "../src/host/BuildToolsRunnerParams";

should();

describe("BuildToolsRunnerParams tests", () => {
  let runnerParam: BuildToolsRunnerParams;

  beforeEach(() => {
    runnerParam = new BuildToolsRunnerParams();
  });

  it("RunnerParams has agent initialized", () => {
    runnerParam.agent.should.contain('powerplatform-build-tools');
    runnerParam.logger.should.not.be.empty;
  });

  it("RunnerParams has workingDir initialized", () => {
    runnerParam.workingDir.should.not.be.empty;
  });
});
