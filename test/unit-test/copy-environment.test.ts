// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/no-explicit-any */

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

describe("copy-environment tests", () => {
  let copyEnvironmentStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    copyEnvironmentStub = stub().returns({
      environmentUrl: 'mocked.url',
      environmentId: 'mocked-id',
    });
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const copy = await rewiremock.around(() => import("../../src/tasks/copy-environment/copy-environment-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ copyEnvironment: copyEnvironmentStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
      });
      copy.main();
  }

  it("fetches parameters from index.ts, calls copyEnvironmentStub properly", async () => {

    await callActionWithMocks();

    copyEnvironmentStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      sourceEnvironment: { name: "Environment", required: false, defaultValue: '$(BuildTools.EnvironmentUrl)' },
      targetEnvironment: { name: 'TargetEnvironmentUrl', required: true, defaultValue: undefined },
      copyType: { name: 'CopyType', required: false, defaultValue: 'MinimalCopy' },
      overrideFriendlyName: { name: 'OverrideFriendlyName', required: false, defaultValue: "false" },
      friendlyTargetEnvironmentName: { name: 'FriendlyName', required: false, defaultValue: undefined },
      skipAuditData: { name: 'SkipAuditData', required: false, defaultValue: false },
      logToConsole: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
