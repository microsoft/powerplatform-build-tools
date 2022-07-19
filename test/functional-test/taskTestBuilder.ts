import { pathExistsSync, createReadStream, readdirSync, emptyDirSync, ensureDirSync, existsSync } from 'fs-extra';
import path = require('path');
import os = require('os');
import unzip = require('unzip-stream');
import process = require('process');

const packageNamePrefix = 'microsoft-IsvExpTools.PowerPlatform-BuildTools-EXPERIMENTAL-';
const packageExtenstion = '.vsix';
const testTempDir = 'pp-bt-test';

export const enum AuthTypes {
  Legacy = "PowerPlatformEnvironment",
  SPN = "PowerPlatformSPN",
}
export default class TaskTestBuilder {

  constructor(authType: AuthTypes) {
    if (process.env.NODE_ENV === 'development') {
      // create a .env file in root directory for testing locally with NODE_ENV = "development"
      require('dotenv').config();
    }
    // convince tasks-under-test to run as if they were launched on an AzDevOps agent:
    process.env['AGENT_JOBNAME'] = "AzDO job";

    process.env['INPUT_AUTHENTICATIONTYPE'] = authType;
    console.log(`Selected authentication mode: ${process.env.INPUT_AUTHENTICATIONTYPE} `);

    const envUrl = process.env['PA_BT_ORG_URL'] ?? 'https://ppbt-comp-test.crm.dynamics.com';

    // for inner dev loop facilitation, specify the below env variables to override the given defaults here:
    if (authType == AuthTypes.Legacy)
      this.setPasswordBasedAuthEnvironmentVariables(authType, envUrl);

    if (authType == AuthTypes.SPN)
      this.setSpnBasedAuthEnvironmentvariables(authType, envUrl);
  }

  private setSpnBasedAuthEnvironmentvariables(authType: AuthTypes, envUrl: string) {
    const appId = process.env['PA_BT_ORG_SPN_ID'] ?? '8a7729e0-2b71-4919-a89a-c789d0a9720a';
    const tenantId = process.env['PA_BT_ORG_SPN_TENANT_ID'] ?? '3041a058-5110-495a-a575-b2a5571d9eac';
    const clientSecret = process.env['PA_BT_ORG_SPNKEY'];
    if (!clientSecret && (authType as AuthTypes) === AuthTypes.SPN) {
      throw new Error("Require PA_BT_ORG_SPNKEY env variable to be set!");
    }

    process.env['INPUT_PowerPlatformSpn'] = 'PP_SPN';
    process.env['ENDPOINT_AUTH_PP_SPN'] = `{ "parameters": { "applicationId": "${appId}", "tenantId": "${tenantId}", "clientSecret": "${clientSecret}" } }`;
    process.env['ENDPOINT_URL_PP_SPN'] = envUrl;
  }

  private setPasswordBasedAuthEnvironmentVariables(authType: AuthTypes, envUrl: string) {
    const username = process.env['PA_BT_ORG_USER'] ?? 'davidjen@ppdevtools.onmicrosoft.com';
    const password = process.env['PA_BT_ORG_PASSWORD'];
    if (!password && (authType as AuthTypes) === AuthTypes.Legacy) {
      throw new Error("Require PA_BT_ORG_PASSWORD environment variable to be set!");
    }

    process.env['INPUT_POWERPLATFORMENVIRONMENT'] = "CDS_ORG";
    process.env['ENDPOINT_AUTH_CDS_ORG'] = `{ "parameters": { "username": "${username}", "password": "${password}" } }`;
    process.env['ENDPOINT_URL_CDS_ORG'] = envUrl;
  }

  initializeTestFiles(successCallBack: Function): string {
    const tasksRootPath = path.resolve(os.tmpdir(), testTempDir);
    const packageToTestPath = this.resolvePackageToTestPath();
    this.unzipVsix(tasksRootPath, packageToTestPath, successCallBack);
    return tasksRootPath;
  }

  cleanUpTestFiles(tasksRootPath: string) {
    emptyDirSync(tasksRootPath);
  }

  private unzipVsix(tasksRoot: string, packageToTest: string, callBack: Function) {
    ensureDirSync(tasksRoot);
    emptyDirSync(tasksRoot);
    createReadStream(packageToTest)
      .pipe(unzip.Extract({ path: tasksRoot }))
      .on("close", callBack.bind(this))
      .on("error", (error: any) => {
        throw new Error(`Failed to extract ${packageToTest} to ${tasksRoot}: error: ${error}`);
      });
  }

  private resolvePackageToTestPath() {

    const outDir = path.resolve(__dirname, '..', '..', 'out');
    const packagesRoot = path.resolve(outDir, 'packages');

    if (!existsSync(packagesRoot))
      throw new Error(`Packages directory does not exist: ${packagesRoot}`);

    const packageToTest = readdirSync(packagesRoot)
      .filter((file) => file.startsWith(packageNamePrefix) && file.endsWith(packageExtenstion))
      .map(file => path.resolve(packagesRoot, file))
      .slice(0, 1)[0];

    if (!pathExistsSync(packageToTest)) {
      throw new Error(`Cannot run component tests before the tasks are packaged! Run 'gulp pack | repack' first.`);
    }
    return packageToTest;
  }

}
