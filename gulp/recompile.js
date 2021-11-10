// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const gulp = require("gulp");
const clean = require("./clean").clean;
const compile = require("./compile");

module.exports = gulp.series(clean, compile);
