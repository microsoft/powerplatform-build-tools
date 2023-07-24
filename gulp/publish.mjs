import createTfxRunner from "./lib/createTfxRunner.mjs";
import yargs from 'yargs';
const argv = yargs(process.argv.slice(2)).argv; // skip 'node' and 'gulp.js' args
import find from "find";

const outDir = 'out';
const packagesDir = `${outDir}/packages`;
const isOfficial = argv.isOfficial || false;

export default async () => {

  console.log(`publish Official:${isOfficial} packages dir:${packagesDir}`);
  var vsixFiles;
  if (isOfficial) {
    vsixFiles = (await findFiles(/microsoft-IsvExpTools.PowerPlatform-BuildTools-\d+.\d+.\d+.vsix$/, packagesDir))
  }
  else {
    vsixFiles = (await findFiles(/microsoft-IsvExpTools.PowerPlatform-BuildTools-EXPERIMENTAL-\d+.\d+.\d+.vsix$/, packagesDir))
  }
  console.log(`Package:${vsixFiles[0]}`);

  const tfxRunner = createTfxRunner();
  await tfxRunner.publishExtension({
    vsix: vsixFiles[0],
    token: "TODO: Add token here"
  });
};

async function findFiles(search, root) {
  return new Promise((resolve) => {
    find.file(search, root, (files) => {
      resolve(files);
    });
  });
}
