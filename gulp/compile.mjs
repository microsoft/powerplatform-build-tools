import fs from "fs-extra";
import { join } from "path";
import webpack from "webpack";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export default function compile() {
  // detect if running on an AzDevOps build agent
  const packageJson = require("../package.json");
  if (process.env.BUILD_BUILDID) {
    // https://docs.microsoft.com/en-us/azure/devops/pipelines/scripts/logging-commands?view=azure-devops&tabs=bash
    console.log(`##vso[build.updatebuildnumber]${packageJson.version}`);
  } else {
    console.log(`local build: ${packageJson.version}`);
  }
  return new Promise((resolve) => {
    const config = require("../webpack.config");
    webpack(config).run(onBuild(resolve));
  });
};

function onBuild(done) {
  return function (err, result) {
    if (err) {
      console.error(`Webpack error:\n${err}`);
      if (done) {
        done();
      }
    } else {
      result.stats.forEach((stats) => {
        Object.keys(stats.compilation.assets).forEach(function (key) {
          console.log(`Webpack: output ${key}`);
        });
        const size = fs.statSync(join(stats.compilation.outputOptions.path, stats.compilation.outputOptions.filename)).size;
        console.log(`Webpack: finished, size = ${size}`);
      });
      if (done) {
        done();
      }
    }
  };
}
