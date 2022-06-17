const path = require("path");
const fs = require('fs-extra');
const esbuild = require('esbuild');
const find = require("find");
const distdir = path.resolve('./dist');

module.exports = function compile() {
  // detect if running on an AzDevOps build agent
  const packageJson = require("../package.json");
  if (process.env.BUILD_BUILDID) {
    // https://docs.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops&tabs=bash
    console.log(`##vso[build.updatebuildnumber]${packageJson.version}`);
  } else {
    console.log(`local build: ${packageJson.version}`);
  }
  return new Promise((resolve, reject) => {
    fs.emptyDirSync(distdir);
    const tasks = find.fileSync(/tasks[/\\].*[/\\]index.ts$/, "src");

    const promises = tasks.map((task, idx) => {
      var baseName = path.basename(path.dirname(task));
      var taskName = path.basename(path.join(task, "../.."))
      const taskDistDir = path.resolve(distdir, "tasks", taskName, baseName);
      console.info(`packaging ${idx} "${task}" into ./dist folder ...`);
      esbuild.build({
        entryPoints: [`./${task}`],
        outfile: path.join(taskDistDir, "index.js"),
        platform: "node",
      }).catch((error) => { console.error(error); reject(error); })
    });

    Promise.all(promises).then(() => {
      message = "all tasks packaged into ./dist folder";
      console.log(message);
      resolve(message);
    });
  });
}
