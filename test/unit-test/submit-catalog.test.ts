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

describe("submit-catalog tests", () => {
  let submitCatalogStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    submitCatalogStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const submitCatalog = await rewiremock.around(() => import("../../src/tasks/submit-catalog/submit-catalog-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ submitCatalog: submitCatalogStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
      });
      submitCatalog.main();
  }

  it("fetches parameters from index.ts, calls submitCatalogStub properly", async () => {

    await callActionWithMocks();

    submitCatalogStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      path: { name: 'CatalogSubmissionFile', required: true, defaultValue: undefined },
      solutionZip: { name: 'SolutionZipFile', required: false, defaultValue: undefined },
      packageZip: { name: 'PackageZipFile', required: false, defaultValue: undefined },
      pollStatus: { name: 'PollStatus', required: false, defaultValue: false }
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
