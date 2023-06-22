import gulp from "gulp";
import nugetInstall from "./lib/nugetInstall.mjs";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const nugetFeeds = require("../nuget.json").feeds;

// https://docs.microsoft.com/en-us/nuget/api/package-base-address-resource
// https://dev.azure.com/msazure/One/_packaging?_a=feed&feed=CAP_ISVExp_Tools_Daily

export default gulp.series(
  ...nugetFeeds
    .map((feed) =>
      feed.packages.map((pkg) => async () => nugetInstall(feed, pkg))
    )
    .flat()
);
