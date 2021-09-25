const gulp = require("gulp");
const mocha = require("gulp-mocha");
const eslint = require("gulp-eslint");

module.exports = function unitTest() {
  return gulp
    .src("test/**/*.test.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
      })
    )
    .pipe(eslint.format());
};
