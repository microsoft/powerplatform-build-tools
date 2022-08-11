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

describe("reset-environment tests", () => {
  let resetEnvironmentStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    resetEnvironmentStub = stub().returns({
      environmentUrl: 'mocked.url',
      environmentId: 'mocked-id',
    });
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const reset = await rewiremock.around(() => import("../../src/tasks/reset-environment/reset-environment-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ resetEnvironment: resetEnvironmentStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
      });
    reset.main();
  }

  it("fetches parameters from index.ts, calls resetEnvironmentStub properly", async () => {

    await callActionWithMocks();

    resetEnvironmentStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environment: { name: "Environment", required: false, defaultValue: '$(BuildTools.EnvironmentUrl)' },
      currency: { name: 'CurrencyName', required: false, defaultValue: 'USD' },
      purpose: { name: 'Purpose', required: false, defaultValue: undefined },
      templates: { name: 'AppsTemplate', required: false, defaultValue: undefined },
      language: { name: 'Language', required: false, defaultValue: 'English (United States)' },
      overrideDomainName: { name: 'OverrideDomainName', required: false, defaultValue: 'false' },
      domainName: { name: 'DomainName', required: false, defaultValue: undefined },
      overrideFriendlyName: { name: 'OverrideFriendlyName', required: false, defaultValue: 'false' },
      friendlyEnvironmentName: { name: 'FriendlyName', required: false, defaultValue: undefined },
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
