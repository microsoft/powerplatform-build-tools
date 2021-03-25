const gulp = require("gulp");
const nugetInstall = require("./lib/nugetInstall");

const nugetFeeds = require("../nuget.json").feeds;

// https://docs.microsoft.com/en-us/nuget/api/package-base-address-resource
// https://dev.azure.com/msazure/One/_packaging?_a=feed&feed=CAP_ISVExp_Tools_Daily

module.exports = gulp.series(
  ...nugetFeeds
    .map((feed) =>
      feed.packages.map((package) => async () => nugetInstall(feed, package))
    )
    .flat()
);
