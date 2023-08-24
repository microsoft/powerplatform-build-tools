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

describe("check solution test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checkSolutionStub: Sinon.SinonStub<any[], any>;
  let credentials: UsernamePassword;

  beforeEach(() => {
    checkSolutionStub = stub();
    credentials = stubInterface<UsernamePassword>();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const checker = await rewiremock.around(
      () => import("../../src/tasks/checker/checker-v2/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ checkSolution: checkSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import('../../src/params/auth/getEnvironmentUrl')).with({ readEnvUrlFromServiceConnection: () => mockEnvironmentUrl });
      });
    await checker.main();
  }

  it("calls check solution", async () => {

    await callActionWithMocks();

    checkSolutionStub.should.have.been.calledOnceWithExactly({
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl,
      fileLocation: { name: 'FileLocation', required: false, defaultValue: 'localFiles' },
      solutionPath: { name: 'FilesToAnalyze', required: false, defaultValue: '**\\*.zip' },
      solutionUrl: { name: 'FilesToAnalyzeSasUri', required: false, defaultValue: undefined },
      filesExcluded: { name: 'FilesToExclude', required: false, defaultValue: undefined },
      ruleLevelOverride: { name: 'RulesToOverride', required: false, defaultValue: undefined },
      ruleSet: { name: 'RuleSet', required: true, defaultValue: undefined },
      errorLevel: { name: 'ErrorLevel', required: false, defaultValue: 'HighIssueCount' },
      errorThreshold: { name: 'ErrorThreshold', required: false, defaultValue: '0' },
      failOnAnalysisError: { name: 'FailOnPowerAppsCheckerAnalysisError', required: false, defaultValue: true },
      artifactStoreName: { name: 'ArtifactDestinationName', required: false, defaultValue: "CodeAnalysisLogs" },
      useDefaultPAEndpoint: { name: 'UseDefaultPACheckerEndpoint', required: false, defaultValue: true },
      customPAEndpoint: { name: 'CustomPACheckerEndpoint', required: true, defaultValue: '' },
      geoInstance: { name: 'GeoInstance', required: false, defaultValue: undefined },
      saveResults: { name: 'SaveResults', required: false, defaultValue: false },
      logToConsole: false,
      verboseLogging: false
    }, new BuildToolsRunnerParams(), new BuildToolsHost('PowerAppsChecker'));
  });
});
