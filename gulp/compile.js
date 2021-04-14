const gulp = require("gulp");
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
      console.error("Error", err);
      if (done) {
        done();
      }
    } else {
      result.stats.forEach((stats) => {
        Object.keys(stats.compilation.assets).forEach(function (key) {
          console.log("Webpack: output ", key);
        });
        console.log("Webpack: finished ", stats.compilation.name);
      });
      if (done) {
        done();
      }
    }
  };
}
