// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { expect, should } from "chai";
import * as sinon from "sinon";
import * as tl from 'azure-pipelines-task-lib/task';
import { getEnvironmentUrl } from "../src/params/auth/getEnvironmentUrl";
import { getCredentials } from "../src/params/auth/getCredentials";
import { EnvUrlVariableName } from "../src/host/PipelineVariables";

should();

const tlStub = sinon.stub(tl);


describe("getEnvironmentUrl tests", () => {
  const testEnvUrl = 'https://ppdevtools.crm.dynamics.com/';

  beforeEach(() => {
    sinon.reset();
    tlStub.getInput
      .withArgs('authenticationType')
      .throws(new Error('Should never reach fallthrough to ServiceConnection!!'));
  });

  it("can read explicit task input parameter with literal url", () => {
    tlStub.getInput
      .withArgs('Environment')
      .returns(testEnvUrl);

    const result = getEnvironmentUrl();
    validateEnvUrl(result);
  });

  it("can read explicit task input parameter with AzDO variable expression", () => {
    tlStub.getInput
      .withArgs('Environment')
      .returns('$(BuildTools.EnvironmentUrl)');
    tlStub.getVariable
      .withArgs('BuildTools.EnvironmentUrl')
      .returns(testEnvUrl);

    const result = getEnvironmentUrl();
    validateEnvUrl(result);
  });

  it("can read explicit task input parameter with user defined AzDO variable expression", () => {
    const myVarName = 'ThisIsMyPipelineVariableName';
    tlStub.getInput
      .withArgs('Environment')
      .returns(`$(${myVarName})`);
    tlStub.getVariable
      .withArgs(myVarName)
      .returns(testEnvUrl);

    const result = getEnvironmentUrl();
    validateEnvUrl(result);
  });

  it("can read from pipeline variable", () => {
    tlStub.getVariable
      .withArgs(EnvUrlVariableName)
      .returns(testEnvUrl);
    const result = getEnvironmentUrl();
    validateEnvUrl(result);
  });

  it("can read CreateEnvironment task's output pipeline variable", () => {
    tlStub.getVariable
      .withArgs('PowerPlatformCreateEnvironment_BuildTools_EnvironmentUrl')
      .returns(testEnvUrl);
    const result = getEnvironmentUrl();
    validateEnvUrl(result);
  });

  it("can fallback to reading url from service connection", () => {
    const authType = 'PowerPlatformSPN';
    tlStub.getInput
      .withArgs('authenticationType')
      .returns(authType)
      .withArgs(authType)
      .returns('PP_SPN');
    tlStub.getEndpointUrl
      .withArgs('PP_SPN', false)
      .returns(testEnvUrl);
    const result = getEnvironmentUrl();
    validateEnvUrl(result);
  });

  function validateEnvUrl(result: string) {
    result.should.be.a('string');
    result.should.not.be.empty;

    let url: URL = new URL('http://invalid');
    expect(() => url = new URL(result)).to.not.throw(TypeError);
    url.toString().should.equal(testEnvUrl);
  }
});

describe("getCredentials tests", () => {
  const PPEnvAuthType = "PowerPlatformEnvironment";
  const testEndpointName = "testEndpoint";

  beforeEach(() => {
    sinon.reset();
    tlStub.getInput
      .withArgs('authenticationType')
      .returns(PPEnvAuthType);
    tlStub.getInput
      .withArgs(PPEnvAuthType)
      .returns(testEndpointName);
    tlStub.getEndpointAuthorization
      .withArgs(testEndpointName, false)
      .returns({ parameters: { 'username': 'me', 'password': 'secret' }, scheme: 'test' });
  });

  const endpointsTests = [
    { endpoint: 'https://ppdevtools.crm.dynamics.com', cloudInstance: 'Public' },
    { endpoint: 'https://aurora.crm10.dynamics.com', cloudInstance: 'Tip1' },
    { endpoint: 'https://kc.crm9.dynamics.com', cloudInstance: 'UsGov' },
    { endpoint: 'https://niehau.crm.dynamics.cn', cloudInstance: 'Mooncake' },
    { endpoint: undefined, cloudInstance: 'Public' },
    { endpoint: 'http://bing.com', cloudInstance: 'Public' },
  ];
  for (const variant of endpointsTests) {
    it(`can resolve '${variant.cloudInstance}' cloud instances from default endpoint ${variant.endpoint}`, () => {
      tlStub.getEndpointUrl
        .withArgs(testEndpointName, true)
        .returns(variant.endpoint);

      const result = getCredentials();
      result.cloudInstance.should.equal(variant.cloudInstance);
    });
}
});
