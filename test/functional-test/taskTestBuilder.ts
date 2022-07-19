import { pathExistsSync, createReadStream, readdirSync, emptyDirSync, ensureDirSync, existsSync } from 'fs-extra';
import path = require('path');
import os = require('os');
import unzip = require('unzip-stream');


const packageNamePrefix = 'microsoft-IsvExpTools.PowerPlatform-BuildTools-EXPERIMENTAL-';
const packageExtenstion = '.vsix';
const testTempDir = 'pp-bt-test';

export default class TaskTestBuilder {

  initializeTestFiles(successCallBack: Function): string {
    const { tasksRootPath, packageToTest } = this.setPaths();
    this.unzipVsix(tasksRootPath, packageToTest, successCallBack);
    return tasksRootPath;
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

  private setPaths() {
    const tasksRootPath = path.resolve(os.tmpdir(), testTempDir);
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
    return { tasksRootPath, packageToTest };
  }

}
