// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const gulp = require("gulp");
const unitTest = require("./unitTest");
const componentTest = require("./componentTest");
const functionalTest = require("./functionalTest");

exports.all = gulp.series(unitTest, functionalTest);
exports.unitTest = unitTest;
exports.componentTest = componentTest;
exports.functionalTest = functionalTest;
