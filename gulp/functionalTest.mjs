// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import gulp from "gulp";
import mocha from "gulp-mocha";
import eslint from "gulp-eslint-new";

export default function functionalTest() {
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
