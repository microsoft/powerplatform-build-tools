const gulp = require("gulp");
const unitTest = require("./unitTest");
const componentTest = require("./componentTest");

module.exports = gulp.series(unitTest, componentTest);
