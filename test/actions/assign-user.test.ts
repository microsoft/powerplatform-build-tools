// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import { UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";

should();
use(sinonChai);

describe("set assign user to target environment", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignUserStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    assignUserStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const mockedModule = await rewiremock.around(() => import("../../src/tasks/assign-user/assign-user-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ assignUser: assignUserStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
      });
    await mockedModule.main();
  }

  it("calls assign user action", async () => {

    await callActionWithMocks();

    assignUserStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environment: { name: 'Environment', required: true, defaultValue: '$(BuildTools.EnvironmentUrl)' },
      objectId: { name: 'User', required: true, defaultValue: undefined },
      role: { name: 'Role', required: true, defaultValue: undefined },
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
