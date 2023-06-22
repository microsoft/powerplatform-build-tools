import { info } from "fancy-log";
import fs from "fs-extra";
const chmod = fs.chmod;
import fetch from "node-fetch";
import { resolve as _resolve } from "path";
import { Extract } from "unzip-stream";
import yargs from 'yargs';
const argv = yargs(process.argv.slice(2)).argv; // skip 'node' and 'gulp.js' args

export default async function nugetInstall(feed, pkg) {
  const packageName = pkg.name.toLowerCase();
  const version = pkg.version.toLowerCase();
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
    const readPAT = argv.feedPAT || process.env[feed.patEnvironmentVariable];
    if (!readPAT) {
      throw new Error(
        `nuget feed ${feed.name} requires authN but env var '${feed.patEnvironmentVariable}' was not defined! Alt: pass in as argument --feedPAT <PAT>`
      );
    }
    reqInit.headers["Authorization"] = `Basic ${Buffer.from(
      "PAT:" + readPAT
    ).toString("base64")}`;
  }

  info(`Downloading package: ${nupkgUrl}...`);
  let res = await fetch(nupkgUrl, reqInit);
  if (res.status === 303) {
    const location = res.headers.get("location");
    const url = new URL(location);
    info(` ... redirecting to: ${url.origin}${url.pathname}}...`);
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

  const targetDir = _resolve(`bin/${pkg.internalName}`);
  info(`Extracting into folder: ${targetDir}`);
  return new Promise((resolve, reject) => {
    res.body
      .pipe(Extract({ path: targetDir }))
      .on("close", () => {
        if (pkg.chmod) {
          const exePath = _resolve(
            targetDir,
            ...pkg.chmod.split(/[\\/]/g)
          );
          chmod(exePath, 0o711);
        }
        resolve();
      })
      .on("error", reject);
  });
};
