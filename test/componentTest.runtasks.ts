import process = require('process');

//whoami inputs
process.env['INPUT_POWERPLATFORMENVIRONMENT'] = "CDS_ORG";
const password = process.env['PA_BT_ORG_PASSWORD'] ?? '';
process.env['ENDPOINT_AUTH_CDS_ORG'] = '{ "parameters": { "username": "davidjen@ppdevtools.onmicrosoft.com", "password": "' + password + '" } }';
process.env['ENDPOINT_URL_CDS_ORG'] = "https://ppbt-comp-test.crm.dynamics.com";
process.env['INPUT_PowerPlatformSpn'] = 'PP_SPN';
const spnKey = process.env['PA_BT_ORG_SPNKEY'] ?? "expectSpnKeyFromEnvVariable";
process.env['ENDPOINT_AUTH_PP_SPN'] = '{ "Parameters": { "applicationId": "8a7729e0-2b71-4919-a89a-c789d0a9720a", "tenantId": "3041a058-5110-495a-a575-b2a5571d9eac", "clientSecret": "' + spnKey + '" } }';
process.env['ENDPOINT_URL_PP_SPN'] = 'https://ppbt-comp-test.crm.dynamics.com';
process.env['INPUT_AUTHENTICATIONTYPE'] = "PowerPlatformEnvironment"; //PowerPlatformSPN
if (password == '') {
  throw new Error("Require PA_BT_ORG_PASSWORD env variable to be set!");
}
//checker inputs
process.env['INPUT_FilesToAnalyze'] = "./test/Test-Data/componentsTestSolution_1_0_0_1.zip";
process.env['INPUT_ArtifactDestinationName'] = "PA-Checker-logs";

//unpack solution inputs
const emptySolutionPath = "./test/Test-Data/emptySolution_0_1_0_0.zip";
const output = "output";
process.env['INPUT_SolutionInputFile'] = emptySolutionPath;
process.env['INPUT_SolutionTargetFolder'] = output;

//pack solution inputs
process.env['INPUT_SolutionOutputFile'] = "packed/solution.zip";
process.env['INPUT_SolutionSourceFolder'] = output;

//import solution inputs
process.env['INPUT_SolutionInputFile'] = emptySolutionPath;
process.env['INPUT_AsyncOperation'] = "true";
process.env['INPUT_MaxAsyncWaitTime'] = "60";
process.env['INPUT_ConvertToManaged'] = "false";
process.env['INPUT_SkipProductUpdateDependencies'] = "false";
process.env['INPUT_OverwriteUnmanagedCustomizations'] = "false";
process.env['INPUT_HoldingSolution'] = "false";

//export solution inputs
process.env['INPUT_SolutionName'] = "emptySolution";

//create environment inputs
process.env["INPUT_LocationName"] = "unitedstates";
process.env["INPUT_EnvironmentSku"] = "Sandbox";
process.env["INPUT_CurrencyName"] = "USD";
process.env["INPUT_DisplayName"] = "ppbt-comp-test";
process.env["INPUT_DomainName"] = "ppbt-comp-test";
//process.env["INPUT_AppsTemplate"] ="D365_Sales"; #bug2471609
process.env["INPUT_LanguageName"] = "English"

//load tasks
const tasks: Array<() => Promise<void>> = [];
import { main as createEnvironment } from "../src/tasks/create-environment/create-environment-v0/index";
tasks.push(createEnvironment);
import { main as whoami } from "../src/tasks/whoami/whoami-v0/index";
tasks.push(whoami);
import { main as checker } from "../src/tasks/checker/checker-v0/index";
tasks.push(checker);
import { main as importSolution } from "../src/tasks/import-solution/import-solution-v0/index";
tasks.push(importSolution);
import { main as exportSolution } from "../src/tasks/export-solution/export-solution-v0/index";
tasks.push(exportSolution);
import { main as unpack } from "../src/tasks/unpack-solution/unpack-solution-v0/index";
tasks.push(unpack);
import { main as pack } from "../src/tasks/pack-solution/pack-solution-v0/index";
tasks.push(pack);
import { main as deleteEnvironment } from "../src/tasks/delete-environment/delete-environment-v0/index";
tasks.push(deleteEnvironment);

//run tasks
(async () => {
  for (const main of tasks) {
    await main().catch(() => {
      throw new Error("Component Test Failed!")
    });
  }
})();
