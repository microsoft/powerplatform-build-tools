import rewiremock from "./rewiremock";
import { should, use } from "chai";
import { stub } from "sinon";
import * as cliWrapper from "@microsoft/powerplatform-cli-wrapper";
import * as sinonChai from "sinon-chai";
should();
use(sinonChai);

describe("WhoAmI Tests", function () {
  it("should call whoAmI", function () {
    const whoAmIStub = stub(cliWrapper, "whoAmI");
    rewiremock("@microsoft/powerplatform-cli-wrapper").with(cliWrapper);
    rewiremock("azure-pipelines-task-lib").notToBeUsed();

    rewiremock.enable();
    require("../src/tasks/whoami/whoami-v0/index");
    rewiremock.disable();

    whoAmIStub.should.have.been.calledOnce;
  });
});
