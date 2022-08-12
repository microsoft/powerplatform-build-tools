// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import rewiremock from 'rewiremock';
import { should, use } from "chai";
import * as sinonChai from "sinon-chai";
import { restore } from "sinon";
import {
  EnvUrlVariableName,
  ApplicationIdlVariableName,
  ClientSecretVariableName,
  TenantIdVariableName,
  DataverseConnectionStringVariableName,
  UserNameVariableName,
  PasswordVariableName
} from "../../src/host/PipelineVariables";

should();
use(sinonChai);
let inputs: { [key: string]: string } = {};
let variables: { [key: string]: string } = {};
let authParams: { [key: string]: string } = {};

describe('set-connection-variables tests', () => {
  beforeEach(() => {
    inputs = {};
    variables = {};
    authParams = {};
  });
  afterEach(() => restore());

  async function callActionWithMocks(): Promise<void> {
    const setConnectionVariables = await rewiremock.around(
      () => import("../../src/tasks/set-connection-variables/set-connection-variables-v2/index"),
      (mock) => {
        mock(() => import("azure-pipelines-task-lib")).with({
          getInputRequired: (name: string) => inputs[name],
          setVariable: (name: string, val: string, secret?: boolean | undefined, isOutput?: boolean | undefined): void => {
            variables[name] = val;
          },
          getVariable: (name: string) => variables[name],
          getEndpointAuthorizationParameterRequired: (id: string, key: string) => authParams[key]
        });
      }
    );

    await setConnectionVariables.main();
  }

  it('calls set-connection-variables with PowerPlatformSPN', async () => {
    inputs['authenticationType'] = 'PowerPlatformSPN';
    inputs['PowerPlatformSPN'] = 'mocked-svc-conn-id';
    variables[EnvUrlVariableName] = 'https://mock-env-url';

    const mockedAppId = 'mocked-app-id';
    const mockedSecret = 'mocked-secret';
    const mockedTenantId = 'mocked-tenant-id';

    authParams['applicationId'] = mockedAppId;
    authParams['clientSecret'] = mockedSecret;
    authParams['tenantId'] = mockedTenantId;

    const expectedDataverseConnectionString = `AuthType=ClientSecret;url=${variables[EnvUrlVariableName]};ClientId=${mockedAppId};ClientSecret=${mockedSecret}`;

    await callActionWithMocks();

    variables[ApplicationIdlVariableName].should.equal(mockedAppId);
    variables[ClientSecretVariableName].should.equal(mockedSecret);
    variables[TenantIdVariableName].should.equal(mockedTenantId);
    variables[DataverseConnectionStringVariableName].should.equal(expectedDataverseConnectionString);
  });

  it('calls set-connection-variables with PowerPlatformEnvironment', async () => {
    inputs['authenticationType'] = 'PowerPlatformEnvironment';
    inputs['PowerPlatformEnvironment'] = 'mocked-svc-conn-id';
    inputs['ApplicationId'] = 'mocked-app-id';
    inputs['RedirectUri'] = 'mocked-redirect-uri';
    variables[EnvUrlVariableName] = 'https://mock-env-url';

    const mockedUserNme = 'some@user.com';
    const mockedPassword = 'somePassord';

    authParams['UserName'] = mockedUserNme;
    authParams['Password'] = mockedPassword;

    const expectedDataverseConnectionString = `AuthType=OAuth;url=${variables[EnvUrlVariableName]};UserName=${mockedUserNme};Password=${mockedPassword};AppId=${inputs['ApplicationId']};RedirectUri=${inputs['RedirectUri']}`;

    await callActionWithMocks();

    variables[UserNameVariableName].should.equal(mockedUserNme);
    variables[PasswordVariableName].should.equal(mockedPassword);
    variables[DataverseConnectionStringVariableName].should.equal(expectedDataverseConnectionString);
  });
});
