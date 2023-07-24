// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

"use strict";

import dotenv from 'dotenv';
dotenv.config();

import gulp from "gulp";

import { clean } from "./gulp/clean.mjs";
import compile from "./gulp/compile.mjs";
import recompile from "./gulp/recompile.mjs";
import lint from "./gulp/lint.mjs";
import { all as testAll, unitTest, componentTest, functionalTest} from "./gulp/test.mjs";
import restore from "./gulp/restore.mjs";
import pack from "./gulp/pack.mjs";
import publish from "./gulp/publish.mjs";

const preparePack = gulp.series(recompile, restore);
const repack = gulp.series(compile, pack);
const ci = gulp.series(recompile, lint, restore, unitTest, pack, functionalTest);

export {
    clean,
    compile,
    recompile,
    lint,
    testAll as test,
    unitTest,
    componentTest,
    functionalTest,
    preparePack,
    pack,
    repack,
    publish,
    ci,
    recompile as default,
    restore,
}

