// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { assert, should, use } from "chai";
import * as sinonChai from "sinon-chai";
import rewiremock from "../rewiremock";
import { debug } from "console";
import { restore } from "sinon";
should();
use(sinonChai);

describe("tool-installer tests", () => {
  const cliLocatorPath = "path/from/mocked/cli/locator";
  const cliExecutablePath = `${cliLocatorPath}/pac/tools`;
  const addToolsToPath = 'AddToolsToPath';
  let prependPathValue: string;
  let inputs: { [key: string]: string };
  let variables: { [key: string]: string };

  beforeEach(() => {
    prependPathValue = '';
    inputs = {};
    variables = {};
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const toolInstaller = await rewiremock.around(
      () => import("../../src/tasks/tool-installer/tool-installer-v2/index"),
      (mock: any) => {
        mock(() => import("azure-pipelines-task-lib")).with({
          getInputRequired: (name: string) => inputs[name],
          setVariable: (name: string, val: string, secret?: boolean | undefined, isOutput?: boolean | undefined): void => {
            variables[name] = val;
          },
          debug: (message: string) => debug(message),
          prependPath: (path: string) => prependPathValue = path
        });
        mock(() => import("../../src/host/CliLocator")).with({
          findPacCLIPath: () => Promise.resolve({ pacRootPath: cliLocatorPath, pacPath: cliExecutablePath })
        });
      });
    await toolInstaller.main();
  }

  it("calls tool-installer", async () => {
    inputs[addToolsToPath] = 'false';
    await callActionWithMocks();
  });

  it("call tool-installer with AddToolsToPath=true and calls prependPath.", async () => {
    inputs[addToolsToPath] = 'true';
    await callActionWithMocks();
    assert.equal(prependPathValue, cliExecutablePath);
  });
});
