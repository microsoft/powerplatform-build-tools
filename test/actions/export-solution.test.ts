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

describe("export-solution tests", () => {
  let exportSolutionStub: Sinon.SinonStub<any[], any>;
  let runnerParameters: RunnerParameters;
  let credentials: UsernamePassword;

  beforeEach(() => {
    exportSolutionStub = stub();
    runnerParameters = stubInterface<RunnerParameters>();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const exportSolution = await rewiremock.around(() => import("../../src/tasks/export-solution/export-solution-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ exportSolution: exportSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
        mock(() => import("../../src/params/runnerParameters")).with({ runnerParameters: runnerParameters });
      });
    exportSolution.main();
  }

  it("fetches parameters from index.ts, calls exportSolutionStub properly", async () => {

    await callActionWithMocks();

    exportSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      name: { name: 'SolutionName', required: true, defaultValue: undefined },
      path: { name: 'SolutionOutputFile', required: true, defaultValue: undefined },
      managed: { name: 'Managed', required: false, defaultValue: false },
      targetVersion: { name: 'TargetVersion', required: false, defaultValue: undefined },
      async: { name: 'AsyncOperation', required: true, defaultValue: true },
      maxAsyncWaitTimeInMin: { name: 'MaxAsyncWaitTime', required: true, defaultValue: '60' },
      autoNumberSettings: { name: 'ExportAutoNumberingSettings', required: false, defaultValue: false },
      calenderSettings: { name: 'ExportCalendarSettings', required: false, defaultValue: false },
      customizationSettings: { name: 'ExportCustomizationSettings', required: false, defaultValue: false },
      emailTrackingSettings: { name: 'ExportEmailTrackingSettings', required: false, defaultValue: false },
      externalApplicationSettings: { name: 'ExportExternalApplicationSettings', required: false, defaultValue: false },
      generalSettings: { name: 'ExportGeneralSettings', required: false, defaultValue: false },
      isvConfig: { name: 'ExportIsvConfig', required: false, defaultValue: false },
      marketingSettings: { name: 'ExportMarketingSettings', required: false, defaultValue: false },
      outlookSynchronizationSettings: { name: 'ExportOutlookSynchronizationSettings', required: false, defaultValue: false },
      relationshipRoles: { name: 'ExportRelationshipRoles', required: false, defaultValue: false },
      sales: { name: 'ExportSales', required: false, defaultValue: false },
    }, runnerParameters, new BuildToolsHost());
  });
});
