// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const gulp = require("gulp");
const mocha = require("gulp-mocha");
const eslint = require("gulp-eslint");
const killUploaderProcess = require('./clean').killUploaderProcess;

module.exports = async function componentTest() {
  await killUploaderProcess();
  return gulp
    .src("test/**/*.runtasks.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
        ui: 'bdd'
      })
    )
    .pipe(eslint.format());
};
