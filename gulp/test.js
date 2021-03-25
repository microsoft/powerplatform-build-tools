const gulp = require("gulp");
const mocha = require("gulp-mocha");
const eslint = require("gulp-eslint");

module.exports = function test() {
  return gulp
    .src("test/**/*.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
        ui: "bdd",
      })
    )
    .pipe(eslint.format());
};
