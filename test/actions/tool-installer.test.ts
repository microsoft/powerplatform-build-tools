// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
// import { stubInterface } from "ts-sinon";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
// import { fake, restore, stub } from "sinon";
// import { mockEnvironmentUrl } from "./mockData";
// import { RunnerParameters, UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
import Sinon = require("sinon");
should();
use(sinonChai);

describe("tool-installer tests", () => {
  async function callActionWithMocks(): Promise<void> {
    const toolInstaller = await rewiremock.around(
      () => import("../../src/tasks/tool-installer/tool-installer-v0/index"),
      (mock) => {
        // mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ whoAmI: whoAmIStub });
        // mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
        // mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
        // mock(() => import("fs/promises")).with({ chmod: fake() });
        // mock(() => import("../../src/params/runnerParameters")).with({ runnerParameters: runnerParameters });
      });
    await toolInstaller.main();
  }

  it("call task", async () => {
    await callActionWithMocks();
  });

});
