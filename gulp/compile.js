const ts = require("gulp-typescript");
const gulp = require("gulp");
const sourcemaps = require("gulp-sourcemaps");
const webpackStream = require("webpack-stream");

module.exports = function compile() {
  const config = require("../webpack.config");
  return gulp
    .src("src/tasks/whoami/whoami-v0/index.ts")
    .pipe(webpackStream(config))
    .pipe(gulp.dest("dist/"));
};
