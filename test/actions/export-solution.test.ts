/* eslint-disable @typescript-eslint/no-explicit-any */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import { mockEnvironmentUrl, mockSolutionName, mockSolutionPath, mockWorkingDirectory } from "./mockData";
import { RunnerParameters, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
should();
use(sinonChai);

describe("export-solution tests", () => {
  let exportSolutionStub: Sinon.SinonStub<any[], any>;
  let runnerParameters: RunnerParameters;
  let credentials: UsernamePassword;
  let getInputStub: Sinon.SinonStub<any[], any>;
  let cwdStub: Sinon.SinonStub<any[], any>;

  beforeEach(() => {
    exportSolutionStub = stub();
    runnerParameters = stubInterface<RunnerParameters>();
    credentials = stubInterface<UsernamePassword>();
    getInputStub = stub();
    cwdStub = stub();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    await rewiremock.around(() => import("../../src/tasks/export-solution/export-solution-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ exportSolution: exportSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
        mock(() => import("../../src/params/runnerParameters")).with({ runnerParameters: runnerParameters });
        mock(() => import("azure-pipelines-task-lib")).with({ getInput: getInputStub, cwd: cwdStub });
      });
  }

  const createMinMockExportSolutionParameters = (): void => {
    getInputStub.withArgs("SolutionName", true).returns(mockSolutionName);
    getInputStub.withArgs("SolutionOutputFile", true).returns(mockSolutionPath);
    getInputStub.withArgs("AsyncOperation", true).returns("false");
    cwdStub.returns(mockWorkingDirectory);
  }

  it("fetches minimum parameters from azure piepline stub, calls exportSolutionStub properly", async () => {
    createMinMockExportSolutionParameters();

    await callActionWithMocks();

    exportSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      name: mockSolutionName,
      path: mockSolutionPath,
      managed: false,
      async: false,
      maxAsyncWaitTimeInMin: 60,
      include: []
    }, runnerParameters);
  });

  it("fetches maximum parameters from azure piepline stub, calls exportSolutionStub properly", async () => {
    createMinMockExportSolutionParameters();
    getInputStub.withArgs("Managed", false).returns("true");
    getInputStub.withArgs("AsyncOperation", true).returns("true");
    getInputStub.withArgs("MaxAsyncWaitTime", true).returns(120);
    getInputStub.withArgs("ExportAutoNumberingSettings", false).returns("true");
    getInputStub.withArgs("ExportCalendarSettings", false).returns("true");
    getInputStub.withArgs("ExportCustomizationSettings", false).returns("true");
    getInputStub.withArgs("ExportEmailTrackingSettings", false).returns("true");
    getInputStub.withArgs("ExportGeneralSettings", false).returns("true");
    getInputStub.withArgs("ExportIsvConfig", false).returns("true");
    getInputStub.withArgs("ExportMarketingSettings", false).returns("true");
    getInputStub.withArgs("ExportOutlookSynchronizationSettings", false).returns("true");
    getInputStub.withArgs("ExportRelationshipRoles", false).returns("true");
    getInputStub.withArgs("ExportSales", false).returns("true");

    await callActionWithMocks();

    exportSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      name: mockSolutionName,
      path: mockSolutionPath,
      managed: true,
      async: true,
      maxAsyncWaitTimeInMin: 120,
      include: ["autonumbering", "calendar", "customization", "emailtracking", "general",
        "isvconfig", "marketing", "outlooksynchronization", "relationshiproles", "sales"]
    }, runnerParameters);
  });
});
