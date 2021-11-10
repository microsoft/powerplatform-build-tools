// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const gulp = require("gulp");
const unitTest = require("./unitTest");
const componentTest = require("./componentTest");

exports.all = gulp.series(unitTest, componentTest);
exports.unitTest = unitTest;
exports.componentTest = componentTest;
