import { ensureDirSync } from "fs-extra";
import path = require("path");
import os = require('os');
import { TaskInfo } from "./functional-test-lib";

export const deleteEnvironmentTaskName = 'delete-environment';
export const createEnvironmentTaskName = 'create-environment';

const prNumber = process.env['PR_NUMBER'];
const runId = process.env['RUN_ID'];
// when running locally, create a postfix w/ hostname; some hosts have FQ domain name, split to just basename
// on CI builds e.g. after merging to main, there's no PR number; use the run id instead
const postfix = prNumber ? `PR${prNumber}` : runId ? `r${runId.slice(-5)}` : os.hostname().split('.')[0].toLowerCase();

const envFriendlyName = `ppbt-ft-${process.platform == 'win32' ? 'win' : 'linux'}-${postfix}`;
const testDataPath = path.resolve(__dirname, '..', 'Test-Data');
const testableEmptySolutionPath = path.join(testDataPath, 'emptySolution_0_1_0_0.zip');
const solutionTestOutputRootDirectory = path.join('out', 'solution-test');
const unpackedSolutionDirectory = path.join(solutionTestOutputRootDirectory, 'unpacked-solution');
const packedSolutionDirectory = path.join(solutionTestOutputRootDirectory, 'packed-solution');
const schemaFile = path.join(testDataPath, 'dataSchema','EnvVarDefs.schema.xml');
const dataZipFolder = path.resolve('out', 'data-test');
const dataZip = path.join(dataZipFolder, 'data.zip');

// AB#2919691 pac CLI stumbles if output folder doesn't exist:
// ensureDirSync(dataZipFolder);
const appsToInstallJson = path.join(testDataPath, 'appsToInstall.json');

export const tasksToTest: TaskInfo[] =
  [
    {
      name: 'tool-installer',
      path: '/tasks/tool-installer/tool-installer-v2'
    },
    {
      name: 'create-environment',
      path: '/tasks/create-environment/create-environment-v2',
      inputVariables: [
        { name: 'LocationName', value: 'unitedstates' },
        { name: 'EnvironmentSku', value: 'Sandbox' },
        { name: 'CurrencyName', value: 'USD' },
        { name: 'DisplayName', value: envFriendlyName },
        { name: 'DomainName', value: envFriendlyName },
        { name: 'LanguageName', value: 'English' },
      ]
    },
    {
      name: 'who-am-i',
      path: '/tasks/whoami/whoami-v2',
    },
    {
      name: 'install-app',
      path: '/tasks/install-application/install-application-v2',
      inputVariables: [
        { name: 'ApplicationList', value: appsToInstallJson },
      ]
    },
    {
      name: 'unpack-solution',
      path: '/tasks/unpack-solution/unpack-solution-v2',
      inputVariables: [
        { name: 'SolutionInputFile', value: testableEmptySolutionPath },
        { name: 'SolutionTargetFolder', value: unpackedSolutionDirectory },
      ]
    },
    {
      name: 'pack-solution',
      path: '/tasks/pack-solution/pack-solution-v2',
      inputVariables: [
        { name: 'SolutionOutputFile', value: path.join(packedSolutionDirectory, 'solution.zip') },
        { name: 'SolutionSourceFolder', value: unpackedSolutionDirectory },
        { name: 'ProcessCanvasApps', value: 'true' },
      ]
    },
    {
      name: 'checker',
      path: '/tasks/checker/checker-v2',
      inputVariables: [
        { name: 'FilesToAnalyze', value: path.join(testDataPath, 'componentsTestSolution_1_0_0_1.zip') },
        { name: 'ArtifactDestinationName', value: 'PA-Checker-logs' },
        { name: 'RuleSet', value: '0ad12346-e108-40b8-a956-9a8f95ea18c9' }
      ]
    },
    {
      name: 'deploy-package',
      path: '/tasks/deploy-package/deploy-package-v2',
      inputVariables: [
        { name: 'PackageFile', value: path.join(testDataPath, 'testPkg', 'bin', 'Debug', 'testPkg.1.0.0.pdpkg.zip')},
        { name: 'Settings', value: 'MyKey=MyValue|MyOtherKey=MyOtherValue|SkipChecks=true' },
      ],
      winOnly: true
    },
    {
      name: 'import-solution',
      path: '/tasks/import-solution/import-solution-v2',
      inputVariables: [
        { name: 'SolutionInputFile', value: testableEmptySolutionPath },
        { name: 'AsyncOperation', value: 'true' },
        { name: 'MaxAsyncWaitTime', value: '60' },
        { name: 'ConvertToManaged', value: 'false' },
        { name: 'SkipProductUpdateDependencies', value: 'false' },
        { name: 'OverwriteUnmanagedCustomizations', value: 'false' },
        { name: 'HoldingSolution', value: 'false' },
      ]
    },
    {
      name: 'export-data',
      path: '/tasks/export-data/export-data-v2',
      inputVariables: [
        { name: 'SchemaFile', value: schemaFile },
        { name: 'DataFile', value: dataZip },
        { name: 'Overwrite', value: 'true' },
      ],
      winOnly: true
    },
    {
      name: 'import-data',
      path: '/tasks/import-data/import-data-v2',
      inputVariables: [
        { name: 'DataFile', value: dataZip }
      ],
      winOnly: true
    },
    {
      name: 'set-solution-version',
      path: '/tasks/set-solution-version/set-solution-version-v2',
      inputVariables: [
        { name: 'SolutionName', value: 'emptySolution' },
        { name: 'SolutionVersionNumber', value: '0.42.0.1' }
      ]
    },
    {
      name: 'export-solution',
      path: '/tasks/export-solution/export-solution-v2',
      inputVariables: [
        { name: 'solutionName', value: 'emptySolution' },
        { name: 'SolutionVersionNumber', value: '0.42.0.2' },
        { name: 'SolutionOutputFile', value: path.join(solutionTestOutputRootDirectory, 'exported-solution', `solution_${new Date().toJSON().slice(0, 10)}.zip`) },
      ]
    },
    {
      name: 'assign-user',
      path: '/tasks/assign-user/assign-user-v2',
      inputVariables: [
        { name: 'user', value: '85fd1857-ddef-46f6-acf4-22a0d1df2cda' },
        { name: 'role', value: 'System Customizer' }
      ]
    },
    {
      name: 'assign-user',
      path: '/tasks/assign-user/assign-user-v2',
      inputVariables: [
        { name: 'user', value: '82e66a08-8bf9-42bf-883a-7e2d17c7cede' },
        { name: 'applicationUser', value: 'true' },
        { name: 'role', value: 'System Customizer' }
      ]
    },
    {
      name: 'assign-group',
      path: '/tasks/assign-group/assign-group-v2',
      inputVariables: [
        { name: 'group', value: 'fef01b9b-da30-4cb5-b6b9-ff34c5d2ca2e' },
        { name: 'groupName', value: `${envFriendlyName} -- Test Group` },
        { name: 'role', value: 'System Customizer' },
        { name: 'teamType', value: 'AadSecurityGroup' },
        { name: 'MembershipType', value: 'Members' },
      ]
    },
    {
      name: 'add-solution-component',
      path: '/tasks/add-solution-component/add-solution-component-v2',
      inputVariables: [
        { name: 'solutionName', value: 'emptySolution' },
        { name: 'Component', value: 'account' },
        { name: 'ComponentType', value: '1' },
        { name: 'AddRequiredComponents', value: 'true' },
      ]
    },
    {
      name: deleteEnvironmentTaskName,
      path: '/tasks/delete-environment/delete-environment-v2'
    },
  ].filter(task => {
    if (os.platform() === 'win32') {
      return true;
    }
    // can't run on non-windows OS:
    return !task.winOnly
  });
