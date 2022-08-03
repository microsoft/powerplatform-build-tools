import path = require("path");
import os = require('os');
import { TaskInfo } from "./functional-test-lib";

export const deleteEnvironmentTaskName = 'delete-environment';
export const createEnvironmentTaskName = 'create-environment';
const envFriendlyName = `ppbt-comp-test-${process.platform == 'win32' ? 'win' : 'linux'}`;
const testDataPath = path.resolve(__dirname, '..', 'Test-Data');
const testableEmptySolutionPath = path.join(testDataPath, 'emptySolution_0_1_0_0.zip');
const solutionTestOutputRootDirectory = 'out/solution-test';
const unpackedSolutionDirectory = `${solutionTestOutputRootDirectory}/unpacked-solution`;
const packedSolutionDirectory = `${solutionTestOutputRootDirectory}/packed-solution`;

export const tasksToTest: TaskInfo[] =
  [
    {
      name: 'tool-installer',
      path: '/tasks/tool-installer/tool-installer-v0'
    },
    {
      name: 'create-environment',
      path: '/tasks/create-environment/create-environment-v0',
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
      path: '/tasks/whoami/whoami-v0',
    },
    {
      name: 'unpack-solution',
      path: '/tasks/unpack-solution/unpack-solution-v0',
      inputVariables: [
        { name: 'SolutionInputFile', value: testableEmptySolutionPath },
        { name: 'SolutionTargetFolder', value: unpackedSolutionDirectory },
      ]
    },
    {
      name: 'pack-solution',
      path: '/tasks/pack-solution/pack-solution-v0',
      inputVariables: [
        { name: 'SolutionOutputFile', value: path.join(packedSolutionDirectory, 'solution.zip') },
        { name: 'SolutionSourceFolder', value: unpackedSolutionDirectory },
        { name: 'ProcessCanvasApps', value: 'true' },
      ]
    },
    {
      name: 'checker',
      path: '/tasks/checker/checker-v0',
      inputVariables: [
        { name: 'FilesToAnalyze', value: path.join(testDataPath, 'componentsTestSolution_1_0_0_1.zip') },
        { name: 'ArtifactDestinationName', value: 'PA-Checker-logs' },
        { name: 'RuleSet', value: '0ad12346-e108-40b8-a956-9a8f95ea18c9' }
      ]
    },
    {
      name: 'deploy-package',
      path: '/tasks/deploy-package/deploy-package-v0',
      inputVariables: [
        { name: 'PackageFile', value: path.join(testDataPath, 'testPkg', 'bin', 'Debug', 'testPkg.1.0.0.pdpkg.zip') }
      ]
    },
    {
      name: 'import-solution',
      path: '/tasks/import-solution/import-solution-v0',
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
      name: 'set-solution-version',
      path: '/tasks/set-solution-version/set-solution-version-v0',
      inputVariables: [
        { name: 'SolutionName', value: 'emptySolution' },
        { name: 'SolutionVersionNumber', value: '0.42.0.1' }
      ]
    },
    {
      name: 'export-solution',
      path: '/tasks/export-solution/export-solution-v0',
      inputVariables: [
        { name: 'solutionName', value: 'emptySolution' },
        { name: 'SolutionVersionNumber', value: '0.42.0.2' },
        { name: 'SolutionOutputFile', value: path.join(solutionTestOutputRootDirectory, 'exported-solution', `solution_${new Date().toJSON().slice(0, 10)}.zip`) },
      ]
    },
    {
      name: 'set-connection-variables',
      path: `/tasks/set-connection-variables/set-connection-variables-v0`
    },
    // {
    //   name: 'assign-user',
    //   path: '/tasks/assign-user/assign-user-v0',
    //   inputVariables: [
    //     { name: 'user', value: '85fd1857-ddef-46f6-acf4-22a0d1df2cda' },
    //     { name: 'role', value: 'System Customizer' }
    //   ]
    // },
    // {
    //   name: 'add-solution-component',
    //   path: '/tasks/add-solution-component/add-solution-component-v0',
    //   inputVariables: [
    //     { name: 'solutionName', value: 'emptySolution' },
    //     { name: 'Component', value: 'account' },
    //     { name: 'ComponentType', value: '1' }
    //   ]
    // },
    {
      name: deleteEnvironmentTaskName,
      path: '/tasks/delete-environment/delete-environment-v0'
    },
  ].filter(task => {
    if (os.platform() === 'win32') {
      return true;
    }
    // can't run on non-windows OS:
    return task.name !== 'deploy-package';
  });
