import rewiremock from "./rewiremock";
import { should, use } from "chai";
import { fake, stub } from "sinon";
import * as cliWrapper from "@microsoft/powerplatform-cli-wrapper";
import * as sinonChai from "sinon-chai";
should();
use(sinonChai);

describe("WhoAmI Tests", function () {
  it("should call whoAmI", async function () {
    const whoAmIStub = stub(cliWrapper, "whoAmI");

    await rewiremock.around(
      () => import("../src/tasks/whoami/whoami-v0/index"),
      (mock) => {
        mock(() => import("@microsoft/powerplatform-cli-wrapper")).with(
          cliWrapper
        );
        mock(() => import("../src/params/auth/getCredentials")).with({
          default: fake(),
        });
        mock(() => import("../src/params/auth/getEnvironmentUrl")).with({
          default: fake(),
        });
        mock(() => import("../src/params/runnerParameters")).notToBeUsed();
      }
    );

    whoAmIStub.should.have.been.calledOnce;
  });
});
