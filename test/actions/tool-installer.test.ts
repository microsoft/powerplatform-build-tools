// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { should, use } from "chai";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
should();
use(sinonChai);

describe("tool-installer tests", () => {
  async function callActionWithMocks(): Promise<void> {
    const toolInstaller = await rewiremock.around(
      () => import("../../src/tasks/tool-installer/tool-installer-v0/index"),
      (mock) => {
        mock(() => import("../../src/host/CliLocator")).with({ findPacCLI: () => Promise.resolve("path/from/mocked/cli/locator") });
      });
    await toolInstaller.main();
  }

  it("call task", async () => {
    await callActionWithMocks();
  });
});
