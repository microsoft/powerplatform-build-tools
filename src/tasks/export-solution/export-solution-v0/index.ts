// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { exportSolution } from "@microsoft/powerplatform-cli-wrapper/dist/actions";
import { host, validator } from "../../../host/Instantiator";
import { getCredentials } from "../../../params/auth/getCredentials";
import { getEnvironmentUrl } from "../../../params/auth/getEnvironmentUrl";
import { runnerParameters } from "../../../params/runnerParameters";

(async () => {

  function getExportSolutionSettings(): string[] {
    const settings = [];

    if (host.getInputAsBool("ExportAutoNumberingSettings", false, false)) { settings.push("autonumbering"); }
    if (host.getInputAsBool("ExportCalendarSettings", false, false)) { settings.push("calendar"); }
    if (host.getInputAsBool("ExportCustomizationSettings", false, false)) { settings.push("customization"); }
    if (host.getInputAsBool("ExportEmailTrackingSettings", false, false)) { settings.push("emailtracking"); }
    if (host.getInputAsBool("ExportGeneralSettings", false, false)) { settings.push("general"); }
    if (host.getInputAsBool("ExportIsvConfig", false, false)) { settings.push("isvconfig"); }
    if (host.getInputAsBool("ExportMarketingSettings", false, false)) { settings.push("marketing"); }
    if (host.getInputAsBool("ExportOutlookSynchronizationSettings", false, false)) { settings.push("outlooksynchronization"); }
    if (host.getInputAsBool("ExportRelationshipRoles", false, false)) { settings.push("relationshiproles"); }
    if (host.getInputAsBool("ExportSales", false, false)) { settings.push("sales"); }

    return settings;
  }

  exportSolution({
    credentials: getCredentials(),
    environmentUrl: getEnvironmentUrl(),
    name: host.getValidInput("SolutionName", true),
    path: host.getWorkingDirectory("SolutionOutputFile", true),
    managed: host.getInputAsBool("Managed", false, false),
    async: host.getInputAsBool("AsyncOperation", true, true),
    maxAsyncWaitTimeInMin: validator.getMaxAsyncWaitTime("MaxAsyncWaitTime", true),
    include: getExportSolutionSettings()
  }, runnerParameters);
})();
