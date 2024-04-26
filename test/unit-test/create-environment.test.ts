// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/no-explicit-any */

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

describe("create-environment tests", () => {
  let createEnvironmentStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    createEnvironmentStub = stub().returns({
      environmentUrl: 'mocked.url',
      environmentId: 'mocked-id',
    });
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const createEnvironment = await rewiremock.around(() => import("../../src/tasks/create-environment/create-environment-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ createEnvironment: createEnvironmentStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
    createEnvironment.main();
  }

  it("fetches parameters from index.ts, calls createEnvironmentStub properly", async () => {

    await callActionWithMocks();

    createEnvironmentStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentName: { name: 'DisplayName', required: true, defaultValue: undefined },
      environmentType: { name: 'EnvironmentSku', required: true, defaultValue: 'Sandbox' },
      region: { name: 'LocationName', required: true, defaultValue: 'unitedstates' },
      currency: { name: 'CurrencyName', required: true, defaultValue: 'USD' },
      language: { name: 'LanguageName', required: true, defaultValue: 'English (United States)' },
      templates: { name: 'AppsTemplate', required: false, defaultValue: undefined },
      domainName: { name: 'DomainName', required: true, defaultValue: undefined },
      teamId: { name: 'TeamId', required: false, defaultValue: undefined },
      securityGroupId: { name: 'SecurityGroupId', required: false, defaultValue: undefined },
      logToConsole: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
