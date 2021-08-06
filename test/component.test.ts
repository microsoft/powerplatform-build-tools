import process = require('process');

const tasks: Array<string> = [];

//whoami inputs
process.env['INPUT_POWERPLATFORMENVIRONMENT'] = "CDS_ORG";
const password = process.env['PA_BT_ORG_PASSWORD'] ?? '';
process.env['ENDPOINT_AUTH_CDS_ORG'] = '{ "parameters": { "username": "davidjen@ppdevtools.onmicrosoft.com", "password": "' + password + '" } }';
process.env['ENDPOINT_URL_CDS_ORG'] = "https://davidjenD365-1.crm.dynamics.com";

process.env['INPUT_PowerPlatformSpn'] = 'PP_SPN';
const spnKey = process.env['PA_BT_ORG_SPNKEY'] ?? "expectSpnKeyFromEnvVariable";
process.env['ENDPOINT_AUTH_PP_SPN'] = '{ "Parameters": { "applicationId": "8a7729e0-2b71-4919-a89a-c789d0a9720a", "tenantId": "3041a058-5110-495a-a575-b2a5571d9eac", "clientSecret": "' + spnKey + '" } }';
process.env['ENDPOINT_URL_PP_SPN'] = 'https://davidjenD365-1.crm.dynamics.com';

process.env['INPUT_AUTHENTICATIONTYPE'] = "PowerPlatformEnvironment"; //PowerPlatformSPN

if (password == '' && process.env['INPUT_AUTHENTICATIONTYPE'] == "PowerPlatformEnvironment"
  || spnKey == "expectSpnKeyFromEnvVariable" && process.env['INPUT_AUTHENTICATIONTYPE'] == "PowerPlatformSPN")
{
  throw new Error("Require either a Credential parameter or OrgUser/OrgPassword params to be set!");
}

//whoami
tasks.push("../src/tasks/whoami/whoami-v0/index");

tasks.forEach(function (index) {
  require(index);
});
