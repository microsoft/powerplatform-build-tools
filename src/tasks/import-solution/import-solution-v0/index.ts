// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { importSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { host, validator } from "../../../host/Instantiator";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {
  importSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    path: host.getWorkingDirectory("SolutionInputFile", true),
    deploymentSettingsFilePath: validator.getDeploymentSettingsFile("UseDeploymentSettingsFile", false, "DeploymentSettingsFile"),
    async: host.getInputAsBool("AsyncOperation", true, true),
    maxAsyncWaitTimeInMin: validator.getMaxAsyncWaitTime("MaxAsyncWaitTime", true),
    importAsHolding: host.getInputAsBool("HoldingSolution", false, false),
    forceOverwrite: host.getInputAsBool("OverwriteUnmanagedCustomizations", false, false),
    publishChanges: host.getInputAsBool("PublishWorkflows", false, true),
    skipDependencyCheck: host.getInputAsBool("SkipProductUpdateDependencies", false, false),
    convertToManaged: host.getInputAsBool("ConvertToManaged", false, false)
  }, runnerParameters);
})();
