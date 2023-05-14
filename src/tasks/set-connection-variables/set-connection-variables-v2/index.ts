// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as tl from 'azure-pipelines-task-lib/task';
import { isRunningOnAgent } from "../../../params/auth/isRunningOnAgent";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import {
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
  const environmentUrl = getEnvironmentUrl();

  switch (authenticationType) {
    case 'PowerPlatformSPN': {
      const powerPlatformSPN = tl.getInputRequired(authenticationType);
      const applicationId = tl.getEndpointAuthorizationParameterRequired(powerPlatformSPN, 'applicationId');
      const clientSecret = tl.getEndpointAuthorizationParameterRequired(powerPlatformSPN, 'clientSecret');
      const tenantId = tl.getEndpointAuthorizationParameterRequired(powerPlatformSPN, 'tenantId');

      tl.setVariable(ApplicationIdlVariableName, applicationId, true);
      tl.setVariable(ClientSecretVariableName, clientSecret, true);
      tl.setVariable(TenantIdVariableName, tenantId, true);

      const dataverseConnectionString = `AuthType=ClientSecret;url=${environmentUrl};ClientId=${applicationId};ClientSecret=${clientSecret}`;
      tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);

      break;
    }

    case 'PowerPlatformEnvironment': {
      const powerPlatformEnvironment = tl.getInputRequired(authenticationType);
      const userName = tl.getEndpointAuthorizationParameterRequired(powerPlatformEnvironment, 'UserName');
      tl.setVariable(UserNameVariableName, userName, true);
      const password = tl.getEndpointAuthorizationParameterRequired(powerPlatformEnvironment, 'Password');
      tl.setVariable(PasswordVariableName, password, true);
      const applicationId = tl.getInputRequired('ApplicationId');
      const redirectUri = tl.getInputRequired('RedirectUri');

      const dataverseConnectionString = `AuthType=OAuth;url=${environmentUrl};UserName=${userName};Password=${password};AppId=${applicationId};RedirectUri=${redirectUri}`;
      tl.setVariable(DataverseConnectionStringVariableName, dataverseConnectionString, true);

      break;
    }

    default: break;
  }
}
