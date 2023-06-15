// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import gulp from "gulp";
import mocha from "gulp-mocha";
import eslint from "gulp-eslint";
import { killUploaderProcess } from './clean.mjs';

export default async function componentTest() {
  await killUploaderProcess();
  return gulp
    .src("test/**/*.runtasks.ts", { read: false })
    .pipe(
      mocha({
        require: ["ts-node/register"],
        ui: 'bdd'
      }).on('error', process.exit.bind(process, 1))
    ).pipe(eslint.format());
};
