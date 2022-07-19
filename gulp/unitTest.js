const gulp = require("gulp");
const mocha = require("gulp-mocha");
const eslint = require("gulp-eslint");

module.exports = function unitTest() {
  return gulp
    .src("test/unit-test/*.test.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
        ui: 'bdd',
        color: true,
      }).on('error', process.exit.bind(process, 1))
    )
    .pipe(eslint.format());
};
