// // Copyright (c) Microsoft Corporation.
// // Licensed under the MIT License.
// /* eslint-disable @typescript-eslint/no-explicit-any */

// import { should, use } from "chai";
// import { stubInterface } from "ts-sinon";
// import * as sinonChai from "sinon-chai";
// import rewiremock from "../rewiremock";
// import { restore, stub } from "sinon";
// import { mockEnvironmentUrl } from "./mockData";
// import { UsernamePassword } from "@microsoft/powerplatform-cli-wrapper";
// import Sinon = require("sinon");
// import { BuildToolsHost } from "../../src/host/BuildToolsHost";
// import { BuildToolsRunnerParams } from "../../src/host/BuildToolsRunnerParams";

// should();
// use(sinonChai);

// describe("import-data tests", () => {
//   let importDataStub: Sinon.SinonStub<any[], any>;
//   let credentials: UsernamePassword;

//   beforeEach(() => {
//     importDataStub = stub().returns({
//       dataFile: 'mocked.zip',
//       connectionCount: '5',
//     });
//     credentials = stubInterface<UsernamePassword>();
//   });
//   afterEach(() => restore());

//   async function callActionWithMocks(): Promise<void> {
//     const dataImport = await rewiremock.around(() => import("../../src/tasks/import-data/import-data-v2/index"),
//       (mock) => {
//         mock(() => import("@microsoft/powerplatform-cli-wrapper/dist/actions")).with({ dataImport: importDataStub });
//         mock(() => import("../../src/params/auth/getCredentials")).with({ getCredentials: () => credentials });
//         mock(() => import("../../src/params/auth/getEnvironmentUrl")).with({ getEnvironmentUrl: () => mockEnvironmentUrl });
//       });
//       dataImport.main();
//   }

//   it("fetches parameters from index.ts, calls importDataStub properly", async () => {

//     await callActionWithMocks();

//     importDataStub.should.have.been.calledOnceWithExactly({
//       credentials: credentials,
//       environmentUrl: mockEnvironmentUrl,
//       data: { name: 'DataFile', required: true, defaultValue: undefined },
//       connectionCount: { name: 'ConnectionCount', required: false, defaultValue: '5' },
//       logToConsole: false
//     }, new BuildToolsRunnerParams(), new BuildToolsHost());
//   });
// });
