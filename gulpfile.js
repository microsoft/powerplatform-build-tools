// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

require("dotenv").config();

"use strict";
const gulp = require("gulp");

const clean = require("./gulp/clean").clean;
const compile = require("./gulp/compile");
const recompile = require("./gulp/recompile");
const lint = require("./gulp/lint");
const test = require("./gulp/test");
const restore = require("./gulp/restore");
const pack = require("./gulp/pack");

exports.clean = clean;
exports.compile = compile;
exports.recompile = recompile;
exports.lint = lint;
exports.test = test.all;
exports.unitTest = test.unitTest;
exports.componentTest = test.componentTest;
exports.functionalTest = test.functionalTest;
exports.preparePack = gulp.series(recompile, restore);
exports.pack = pack;
exports.repack = gulp.series(compile, pack);
exports.ci = gulp.series(recompile, lint, restore, test.unitTest, pack, test.functionalTest);
exports.default = recompile;
exports.restore = restore;
