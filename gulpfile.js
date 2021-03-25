"use strict";
const gulp = require("gulp");

const clean = require("./gulp/clean");
const compile = require("./gulp/compile");
const recompile = require("./gulp/recompile");
const lint = require("./gulp/lint");
const test = require("./gulp/test");
const restore = require("./gulp/restore");

exports.clean = clean;
exports.compile = compile;
exports.recompile = recompile;
exports.lint = lint;
exports.test = test;
exports.ci = gulp.series(recompile, lint, restore, test);
exports.dist = recompile;
exports.default = recompile;
