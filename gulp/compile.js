const ts = require("gulp-typescript");
const gulp = require("gulp");
const sourcemaps = require("gulp-sourcemaps");

module.exports = function compile() {
  const tsProj = ts.createProject("tsconfig.json");
  return gulp
    .src("src/**/*.ts")
    .pipe(sourcemaps.init())
    .pipe(tsProj())
    .pipe(sourcemaps.write("./", { sourceRoot: "./", includeContent: false }))
    .pipe(gulp.dest("dist"));
};
