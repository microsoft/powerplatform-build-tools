// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import {  restore, stub } from "sinon";
import { mockEnvironmentUrl } from "./mockData";
import {  UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";

should();
use(sinonChai);

describe("pack solution test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let packSolutionStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    packSolutionStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const pack = await rewiremock.around(
      () => import("../../src/tasks/pack-solution/pack-solution-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ packSolution: packSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
    pack.main();
  }

  it("calls pack solution", async () => {

    await callActionWithMocks();

    packSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      solutionZipFile: { name: 'SolutionOutputFile', required: true, defaultValue: undefined },
      sourceFolder: { name: 'SolutionSourceFolder', required: true, defaultValue: undefined },
      solutionType: { name: 'SolutionType', required: false, defaultValue: "Unmanaged" },
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
