// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import { mockEnvironmentUrl } from "./mockData";
import { RunnerParameters, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
should();
use(sinonChai);

describe("restore-environment tests", () => {
  let restoreEnvironmentStub: Sinon.SinonStub<any[], any>;
  let runnerParameters: RunnerParameters;
  let credentials: UsernamePassword;

  beforeEach(() => {
    restoreEnvironmentStub = stub();
    runnerParameters = stubInterface<RunnerParameters>();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    await rewiremock.around(() => import("../../src/tasks/restore-environment/restore-environment-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ restoreEnvironment: restoreEnvironmentStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
        mock(() => import("../../src/params/runnerParameters")).with({ runnerParameters: runnerParameters });
      });
  }

  it("fetches parameters from index.ts, calls restoreEnvironmentStub properly", async () => {

    await callActionWithMocks();

    restoreEnvironmentStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      sourceEnvironmentUrl: mockEnvironmentUrl,
      targetEnvironmentUrl: { name: 'TargetEnvironmentUrl', required: true, defaultValue: undefined },
      restoreLatestBackup: { name: 'RestoreLatestBackup', required: false, defaultValue: true },
      backupDateTime: { name: 'RestoreTimeStamp', required: true, defaultValue: '' },
      targetEnvironmentName: { name: 'FriendlyName', required: false, defaultValue: undefined },
    }, runnerParameters, new BuildToolsHost());
  });
});
