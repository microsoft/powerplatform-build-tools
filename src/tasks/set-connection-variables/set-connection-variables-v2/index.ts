// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import {
  EnvUrlVariableName,
  ApplicationIdlVariableName,
  ClientSecretVariableName,
  TenantIdVariableName,
  DataverseConnectionStringVariableName,
  UserNameVariableName,
  PasswordVariableName
} from "../../../host/PipelineVariables";

(async () => {
  if (isRunningOnAgent()) {
    await main();
  }
})().catch(error => {
  tl.setResult(tl.TaskResult.Failed, error);
});

export async function main(): Promise<void> {
  const authenticationType = tl.getInputRequired('authenticationType');
  const endpointUrl = tl.getVariable(EnvUrlVariableName);

  switch (authenticationType) {
    case 'PowerPlatformSPN': {
      const powerPlatformSPN = tl.getInputRequired(authenticationType);
      const applicationId = tl.getEndpointAuthorizationParameterRequired(powerPlatformSPN, 'applicationId');
      const clientSecret = tl.getEndpointAuthorizationParameterRequired(powerPlatformSPN, 'clientSecret');
      const tenantId = tl.getEndpointAuthorizationParameterRequired(powerPlatformSPN, 'tenantId');

      tl.setVariable(ApplicationIdlVariableName, applicationId, true);
      tl.setVariable(ClientSecretVariableName, clientSecret, true);
      tl.setVariable(TenantIdVariableName, tenantId, true);

      const dataverseConnectionString = `AuthType=ClientSecret;url=${endpointUrl};ClientId=${applicationId};ClientSecret=${clientSecret}`;
      tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);

      break;
    }

    case 'PowerPlatformEnvironment': {
      const powerPlatformEnvironment = tl.getInputRequired(authenticationType);
      const userName = tl.getEndpointAuthorizationParameterRequired(powerPlatformEnvironment, 'UserName');
      tl.setVariable(UserNameVariableName, userName, true);
      const password = tl.getEndpointAuthorizationParameterRequired(powerPlatformEnvironment, 'Password');
      tl.setVariable(PasswordVariableName, password, true);
      const applicationId = tl.getInput('ApplicationId');
      const redirectUri = tl.getInput('RedirectUri');

      if (applicationId == '' || redirectUri == '') {
        console.log(`${DataverseConnectionStringVariableName} variable was not set. ApplicationId and RedirectUri are required to generate a valid Dataverse connection string.`);
      }
      else {
        const dataverseConnectionString = `AuthType=OAuth;url=${endpointUrl};UserName=${userName};Password=${password};AppId=${applicationId};RedirectUri=${redirectUri}`;
        tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);
      }
      break;
    }

    default: break;
  }
}
