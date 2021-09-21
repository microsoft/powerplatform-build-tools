const gulp = require("gulp");
const mocha = require("gulp-mocha");
const eslint = require("gulp-eslint");

module.exports = function componentTest() {
  return gulp
    .src("test/**/*.runtasks.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
      })
    )
    .pipe(eslint.format());
};
