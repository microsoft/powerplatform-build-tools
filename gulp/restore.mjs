import gulp from "gulp";
import nugetInstall from "./lib/nugetInstall.mjs";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const nugetConfig = require("../nuget.json");

// https://docs.microsoft.com/en-us/nuget/api/package-base-address-resource
// https://dev.azure.com/msazure/One/_packaging?_a=feed&feed=CAP_ISVExp_Tools_Daily

export default gulp.series(
  ...nugetConfig.packages
    .map((pkg) => async () => nugetInstall(pkg, nugetConfig.feeds))
    .flat()
);
