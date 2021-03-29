const ts = require("gulp-typescript");
const gulp = require("gulp");
const sourcemaps = require("gulp-sourcemaps");
var merge = require('merge-stream');

module.exports = function compile() {
  const tsProj = ts.createProject("tsconfig.json");
  const tsProj2 = ts.createProject("tsconfig.json");

  let src = gulp
    .src("src/**/*.ts")
    .pipe(sourcemaps.init())
    .pipe(tsProj())
    .pipe(sourcemaps.write("./", { sourceRoot: "./", includeContent: false }))
    .pipe(gulp.dest("out"));


  let mock = gulp
    .src("test/**/*.mock.ts")
    .pipe(sourcemaps.init())
    .pipe(tsProj2())
    .pipe(sourcemaps.write("./", { sourceRoot: "./", includeContent: false }))
    .pipe(gulp.dest("out/test/"));

  return merge(src, mock);
};
