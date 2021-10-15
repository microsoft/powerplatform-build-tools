import process = require('process');

//whoami inputs
process.env['INPUT_POWERPLATFORMENVIRONMENT'] = "CDS_ORG";
const password = process.env['PA_BT_ORG_PASSWORD'] ?? '';
process.env['ENDPOINT_AUTH_CDS_ORG'] = '{ "parameters": { "username": "davidjen@ppdevtools.onmicrosoft.com", "password": "' + password + '" } }';
process.env['ENDPOINT_URL_CDS_ORG'] = "https://ppdevtools.crm.dynamics.com";
process.env['INPUT_PowerPlatformSpn'] = 'PP_SPN';
const spnKey = process.env['PA_BT_ORG_SPNKEY'] ?? "expectSpnKeyFromEnvVariable";
process.env['ENDPOINT_AUTH_PP_SPN'] = '{ "Parameters": { "applicationId": "8a7729e0-2b71-4919-a89a-c789d0a9720a", "tenantId": "3041a058-5110-495a-a575-b2a5571d9eac", "clientSecret": "' + spnKey + '" } }';
process.env['ENDPOINT_URL_PP_SPN'] = 'https://ppdevtools.crm.dynamics.com';
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
process.env["INPUT_DisplayName"] = "ppdevtools-2";
process.env["INPUT_DomainName"] = "ppdevtools-2";
//process.env["INPUT_AppsTemplate"] ="D365_Sales"; #bug2471609
process.env["INPUT_LanguageName"] = "English"

//load tasks
const tasks: Map<string, () => Promise<void>> = new Map();
import { main as whoami } from "../src/tasks/whoami/whoami-v0/index";
tasks.set("whoami", whoami);
import { main as checker } from "../src/tasks/checker/checker-v0/index";
tasks.set("check solution", checker);
import { main as unpack } from "../src/tasks/unpack-solution/unpack-solution-v0/index";
tasks.set("unpack solution", unpack);
import { main as pack } from "../src/tasks/pack-solution/pack-solution-v0/index";
tasks.set("pack solution", pack);
import { main as importSolution } from "../src/tasks/import-solution/import-solution-v0/index";
tasks.set("import solution", importSolution);
// import { main as exportSolution } from "../src/tasks/export-solution/export-solution-v0/index";
// tasks.set("export solution", exportSolution); THROWS AN ERROR BC PACK CREATES EXISTING ZIP
// import { main as createEnvironment } from "../src/tasks/create-environment/create-environment-v0/index";
// tasks.set("create environment", createEnvironment); NEED TO DELETE?

//run tasks
(async () => {
  for (const [name, task] of tasks.entries()) {
    await task().catch(() => {
      throw new Error(`Component Test Failed! Task ${name} failed`)
    });
  }
})();
