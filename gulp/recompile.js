const gulp = require("gulp");
const clean = require("./clean");
const compile = require("./compile");

module.exports = gulp.series(clean, compile);
