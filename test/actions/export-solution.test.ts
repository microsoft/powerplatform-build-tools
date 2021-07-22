// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { should, use } from "chai";
import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import { mockEnvironmentUrl, solutionName, solutionPath } from "./mockData";
import { RunnerParameters, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
should();
use(sinonChai);

describe("export-solution tests", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    await rewiremock.around(() => import("../../src/tasks/export-solution/export-solution-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ exportSolution: exportSolutionStub });
        mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
        mock(() => import("../../src/params/runnerParameters")).with({ runnerParameters: runnerParameters });
        mock(() => import("../../src/params/solutionParameters")).with({
          getSolutionPath: () => solutionPath,
          getSolutionName: () => solutionName
        });
      });
  }

  it("fetches required parameters, calls exportSolutionStub properly", async () => {

    await callActionWithMocks();

    exportSolutionStub.should.have.been.calledOnceWithExactly({
      name: solutionName,
      path: solutionPath,
      credentials: credentials,
      environmentUrl: mockEnvironmentUrl
    }, runnerParameters);
  });
});
