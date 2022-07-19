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

describe("download paportal test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let unloadPaportalStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    unloadPaportalStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const download = await rewiremock.around(
      () => import("../../src/tasks/download-paportal/download-paportal-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ downloadPaportal: unloadPaportalStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
      download.main();
  }

  it("calls download paportal", async () => {

    await callActionWithMocks();

    unloadPaportalStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      path: { name: 'DownloadPath', required: true, defaultValue: undefined },
      websiteId: { name: 'WebsiteId', required: true, defaultValue: undefined },
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
