const { statSync } = require("fs-extra");
const path = require("path");
const webpack = require("webpack");

module.exports = function compile() {
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
        const size = statSync(path.join(stats.compilation.outputOptions.path, stats.compilation.outputOptions.filename)).size;
        console.log(`Webpack: finished, size = ${size}`);
      });
      if (done) {
        done();
      }
    }
  };
}
