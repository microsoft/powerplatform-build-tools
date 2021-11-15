// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import Sinon = require("sinon");
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";
should();
use(sinonChai);

describe("unpack solution test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unpackSolutionStub: Sinon.SinonStub<any[], any>;

  beforeEach(() => {
    unpackSolutionStub = stub();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const unpack = await rewiremock.around(
      () => import("../../src/tasks/unpack-solution/unpack-solution-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ unpackSolution: unpackSolutionStub });
      });
    unpack.main();
  }

  it("calls unpack solution", async () => {

    await callActionWithMocks();

    unpackSolutionStub.should.have.been.calledOnceWithExactly({
      solutionZipFile: { name: 'SolutionInputFile', required: true, defaultValue: undefined },
      sourceFolder: { name: 'SolutionTargetFolder', required: true, defaultValue: undefined },
      solutionType: { name: 'SolutionType', required: false, defaultValue: "Unmanaged" },
      overwriteFiles: { name: 'OverwriteFiles', required: false, defaultValue: "true" },
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
