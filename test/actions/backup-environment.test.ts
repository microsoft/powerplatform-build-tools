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

describe("backup-environment tests", () => {
  let backupEnvironmentStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    backupEnvironmentStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const backup = await rewiremock.around(() => import("../../src/tasks/backup-environment/backup-environment-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ backupEnvironment: backupEnvironmentStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
      backup.main();
  }

  it("fetches parameters from index.ts, calls backupEnviromentStub properly", async () => {

    await callActionWithMocks();

    backupEnvironmentStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: { name: "EnvironmentUrl", required: true, defaultValue: undefined },
      backupLabel: { name: 'BackupLabel', required: true, defaultValue: 'Full Backup - $(Build.BuildNumber)' }
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
