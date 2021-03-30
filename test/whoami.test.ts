import * as path from "path";
import { expect } from "chai";
import { MockTestRunner } from "azure-pipelines-task-lib/mock-test";

// Mocha test can be run with ts-node.
// Must run tsc on task index.ts and mock runner .ts file.
// https://github.com/microsoft/azure-pipelines-task-lib/blob/master/node/mock-test.ts
// See run and getNodePath functions for reference in linked mock-test.ts.
// Only supports specific versions of node
describe("WhoAmI Tests", function () {
  it("should succeed with simple inputs", function () {
    const mockPath = path.join(__dirname, "mock", "whoami-success.mock.ts");
    const testRunner = new MockTestRunner(mockPath);
    testRunner.run(14);

    expect(testRunner.succeeded).to.be.true;
    // expect(tr.warningIssues.length).to.eq(0);
    // expect(tr.errorIssues.length).to.eq(0);
    //expect(/##vso\[task\.debug\]success/.test(tr.stdout)).to.be.true;
  });
});
