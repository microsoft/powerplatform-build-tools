const path = require("path");
const tsConfig = require("../../tsconfig.json");

const distDir = path.resolve(tsConfig.compilerOptions.outDir);

module.exports = distDir;
