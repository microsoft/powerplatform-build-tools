// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { restore, stub } from "sinon";
import Sinon = require("sinon");
import { BuildToolsHost } from "../../src/host/BuildToolsHost";
import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";

should();
use(sinonChai);

describe("pack solution test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let packSolutionStub: Sinon.SinonStub<any[], any>;

  beforeEach(() => {
    packSolutionStub = stub();
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const pack = await rewiremock.around(
      () => import("../../src/tasks/pack-solution/pack-solution-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ packSolution: packSolutionStub });
      });
    pack.main();
  }

  it("calls pack solution", async () => {

    await callActionWithMocks();

    packSolutionStub.should.have.been.calledOnceWithExactly({
      solutionZipFile: { name: 'SolutionOutputFile', required: true, defaultValue: undefined },
      sourceFolder: { name: 'SolutionSourceFolder', required: true, defaultValue: undefined },
      solutionType: { name: 'SolutionType', required: false, defaultValue: "Unmanaged" },
      errorLevel: { name: 'ErrorLevel', required: false, defaultValue: 'Info' },
      singleComponent: { name: 'SingleComponent', required: false, defaultValue: 'None' },
      mapFile: { name: 'MapFile', required: false, defaultValue: undefined },
      localeTemplate: { name: 'LocaleTemplate', required: false, defaultValue: undefined },
      localize: { name: 'Localize', required: false, defaultValue: false },
      useLcid: { name: 'UseLcid', required: false, defaultValue: false },
      useUnmanagedFileForManaged: {
          name: 'UseUnmanagedFileForMissingManaged',
          required: false,
          defaultValue: false
      },
      disablePluginRemap: {
          name: 'DisablePluginRemap',
          required: false,
          defaultValue: false
      }
    }, new BuildToolsRunnerParams(), new BuildToolsHost());
  });
});
