// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import { mockEnvironmentUrl } from "./mockData";
import { UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";
import { BuildToolsHost } from "../../src/host/BuildToolsHost";

should();
use(sinonChai);

describe("publish customizations tests", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publishSolutionStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    publishSolutionStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const publish = await rewiremock.around(
      () => import("../../src/tasks/publish-customizations/publish-customizations-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ publishSolution: publishSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
      publish.main();
  }

  it("calls publish solution", async () => {

    await callActionWithMocks();

    publishSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
