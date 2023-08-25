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

describe("deploy package tests", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deployPackageStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    deployPackageStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const deployPackage = await rewiremock.around(
      () => import("../../src/tasks/deploy-package/deploy-package-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ deployPackage: deployPackageStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
    deployPackage.main();
  }

  it("calls deploy package", async () => {

    await callActionWithMocks();

    deployPackageStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      packagePath: { name: 'PackageFile', required: true, defaultValue: undefined },
      settings: { name: 'Settings', required: false, defaultValue: undefined },
      logConsole: false,
      logToConsole: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost('DeployPackage'));
  });
});
