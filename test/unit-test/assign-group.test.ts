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

describe("Assign group to target environment", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assignGroupStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    assignGroupStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const mockedModule = await rewiremock.around(() => import("../../src/tasks/assign-group/assign-group-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ assignGroup: assignGroupStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
      });
    await mockedModule.main();
  }

  it("calls assign group action", async () => {

    await callActionWithMocks();

    assignGroupStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environment: { name: 'Environment', required: true, defaultValue: '$(BuildTools.EnvironmentUrl)' },
      azureAadGroup: { name: 'Group', required: true, defaultValue: undefined },
      groupName: { name: 'GroupName', required: true, defaultValue: undefined },
      role: { name: 'Role', required: true, defaultValue: undefined },
      teamType: { name: 'TeamType', required: true, defaultValue: undefined },
      membershipType: { name: 'MembershipType', required: true, defaultValue: undefined },
      businessUnit: { name: 'BusinessUnit', required: false, defaultValue: undefined },
      logToConsole: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
