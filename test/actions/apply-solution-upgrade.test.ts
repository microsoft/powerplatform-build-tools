// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { fake, restore, stub } from "sinon";
import { mockEnvironmentUrl } from "./mockData";
import { RunnerParameters, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
should();
use(sinonChai);

describe("upgrade solution test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upgradeSolutionStub: Sinon.SinonStub<any[], any>;
  let runnerParameters: RunnerParameters;
  let credentials: UsernamePassword;

  beforeEach(() => {
    upgradeSolutionStub = stub();
    runnerParameters = stubInterface<RunnerParameters>();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    await rewiremock.around(
      () => import("../../src/tasks/apply-solution-upgrade/apply-solution-upgrade-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ upgradeSolution: upgradeSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
        mock(() => import("fs/promises")).with({ chmod: fake() });
        mock(() => import("../../src/params/runnerParameters")).with({ runnerParameters: runnerParameters });
      });
  }

  it("calls upgrade solution", async () => {

    await callActionWithMocks();

    upgradeSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      name: { name: 'SolutionName', required: true, defaultValue: undefined },
      async: { name: 'AsyncOperation', required: true, defaultValue: true },
      maxAsyncWaitTimeInMin: { name: 'MaxAsyncWaitTime', required: true, defaultValue: '60' },
    }, runnerParameters, new BuildToolsHost());
  });
});
