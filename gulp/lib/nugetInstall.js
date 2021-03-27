const log = require("fancy-log");
const { chmod } = require("fs-extra");
const fetch = require("node-fetch");
const path = require("path");
const unzip = require("unzip-stream");

module.exports = async function nugetInstall(feed, package) {
  const packageName = package.name.toLowerCase();
  const version = package.version.toLowerCase();
  const packagePath = `${packageName}/${version}/${packageName}.${version}.nupkg`;

  const nupkgUrl = new URL(packagePath, feed.url);
  const reqInit = {
    headers: {
      "User-Agent": "gulpfile-DAP-team/0.1",
      Accept: "*/*",
    },
    redirect: "manual",
  };
  if (feed.authenticated) {
    const readPAT = process.env[feed.patEnvironmentVariable];
    if (!readPAT) {
      throw new Error(
        `nuget feed ${feed.name} requires authN but env var '${feed.patEnvironmentVariable}' was not defined!`
      );
    }
    reqInit.headers["Authorization"] = `Basic ${Buffer.from(
      "PAT:" + readPAT
    ).toString("base64")}`;
  }

  log.info(`Downloading package: ${nupkgUrl}...`);
  let res = await fetch(nupkgUrl, reqInit);
  if (res.status === 303) {
    const location = res.headers.get("location");
    const url = new URL(location);
    log.info(` ... redirecting to: ${url.origin}${url.pathname}}...`);
    // AzDevOps feeds will redirect to Azure storage with location url w/ SAS token: on 2nd request drop authZ header
    delete reqInit.headers["Authorization"];
    res = await fetch(location, reqInit);
  }
  if (!res.ok) {
    throw new Error(
      `Cannot download ${res.url}, status: ${res.statusText} (${
        res.status
      }), body: ${res.body.read()?.toString("ascii")}`
    );
  }

  const targetDir = path.resolve(`bin/${package.internalName}`);
  log.info(`Extracting into folder: ${targetDir}`);
  return new Promise((resolve, reject) => {
    res.body
      .pipe(unzip.Extract({ path: targetDir }))
      .on("close", () => {
        if (package.chmod) {
          const exePath = path.resolve(
            targetDir,
            ...package.chmod.split(/[\\/]/g)
          );
          chmod(exePath, 0o711);
        }
        resolve();
      })
      .on("error", reject);
  });
};
