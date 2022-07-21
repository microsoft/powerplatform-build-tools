// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const gulp = require("gulp");
const mocha = require("gulp-mocha");
const eslint = require("gulp-eslint");

module.exports = function functionalTest() {
  return gulp
    .src("test/functional-test/*.test.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
        ui: 'bdd',
        color: true,
        timeout: 999999,
        bail: true,
      }).on('error', process.exit.bind(process, 1))
    )
    .pipe(eslint.format());
};
