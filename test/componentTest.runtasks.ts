import process = require('process');

const tasks: Array<() => Promise<void>> = [];

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

import { main as whoami } from "../src/tasks/whoami/whoami-v0/index";
if (password == '')
{
  throw new Error("Require PA_BT_ORG_PASSWORD env variable to be set!");
}

//whoami
tasks.push(whoami);

tasks.forEach(async function (main) {
  main().catch(() => {
    throw new Error("Component Test Failed!")
  });
});
