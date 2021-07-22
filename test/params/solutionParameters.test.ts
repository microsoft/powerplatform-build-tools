// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { expect, should, use } from "chai";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { stub } from "sinon";
import { solutionName } from "../actions/mockData";
should();
use(sinonChai);

describe("solutionParameters tests", () => {
  it("calls getSolutionName", async () => {
    const getInputStub = stub();
    getInputStub.withArgs("SolutionName", true).returns(solutionName);

    const mockedSolutionParametersModule = await rewiremock.around(
      () => import("../../src/params/solutionParameters"),
      (mock) => {
        mock(() => import("azure-pipelines-task-lib")).with({ getInput: getInputStub });
      });

    expect(mockedSolutionParametersModule.getSolutionName()).to.equal(solutionName);
  });
});
