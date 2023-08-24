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
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";

should();
use(sinonChai);

describe("set online version solution test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onlineVersionSolutionStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    onlineVersionSolutionStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const apply = await rewiremock.around(
      () => import("../../src/tasks/set-solution-version/set-solution-version-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ onlineVersionSolution: onlineVersionSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
      apply.main();
  }

  it("calls set online version solution", async () => {

    await callActionWithMocks();

    onlineVersionSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      name: { name: 'SolutionName', required: true, defaultValue: undefined },
      version: { name: 'SolutionVersionNumber', required: true, defaultValue: undefined },
      logToConsole: false,
      verboseLogging: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
