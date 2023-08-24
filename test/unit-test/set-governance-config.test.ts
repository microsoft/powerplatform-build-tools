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

describe("set governance config test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setGovernanceConfigStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    setGovernanceConfigStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const mockedModule = await rewiremock.around(() => import("../../src/tasks/set-governance-config/set-governance-config-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ setGovernanceConfig: setGovernanceConfigStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
      });
    await mockedModule.main();
  }

  it("calls set governance config action", async () => {

    await callActionWithMocks();

    setGovernanceConfigStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environment: { name: 'Environment', required: true, defaultValue: '$(BuildTools.EnvironmentUrl)' },
      protectionLevel: { name: 'ProtectionLevel', required: true, defaultValue: 'Standard' },
      disableGroupSharing: { name: 'DisableGroupSharing', required: false, defaultValue: undefined },
      excludeAnalysis: { name: 'ExcludeAnalysis', required: false, defaultValue: undefined },
      includeInsights: { name: 'IncludeInsights', required: false, defaultValue: undefined },
      limitSharingMode: { name: 'LimitSharingMode', required: false, defaultValue: undefined },
      maxLimitUserSharing: { name: 'MaxLimitUserSharing', required: false, defaultValue: undefined },
      solutionCheckerMode: { name: 'SolutionCheckerMode', required: false, defaultValue: undefined },
      logToConsole: false,
      verboseLogging: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
