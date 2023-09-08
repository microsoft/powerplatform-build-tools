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

describe("restore-environment tests", () => {
  let restoreEnvironmentStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    restoreEnvironmentStub = stub().returns({
      environmentUrl: 'mocked.url',
      environmentId: 'mocked-id',
    });
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const restore = await rewiremock.around(() => import("../../src/tasks/restore-environment/restore-environment-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ restoreEnvironment: restoreEnvironmentStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
      });
    restore.main();
  }

  it("fetches parameters from index.ts, calls restoreEnvironmentStub properly", async () => {

    await callActionWithMocks();

    restoreEnvironmentStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      sourceEnvironment: { name: "Environment", required: false, defaultValue: '$(BuildTools.EnvironmentUrl)' },
      targetEnvironment: { name: 'TargetEnvironmentUrl', required: true, defaultValue: undefined },
      restoreLatestBackup: { name: 'RestoreLatestBackup', required: false, defaultValue: true },
      backupDateTime: { name: 'RestoreTimeStamp', required: true, defaultValue: '' },
      targetEnvironmentName: { name: 'FriendlyName', required: false, defaultValue: undefined },
      skipAuditData: { name: 'SkipAuditData', required: false, defaultValue: false },
      maxAsyncWaitTime: { name: 'MaxAsyncWaitTime', required: false, defaultValue: undefined },
      logToConsole: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
