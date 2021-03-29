import { resolve, dirname, basename } from "path";

export default function getExePath(...relativePath: string[]): string {
  // in mocha, __dirname resolves to the src folder of the .ts file,
  // but when running the .js file directly, e.g. from the /dist folder, it will be from that folder
  const currentDirectory = resolve(__dirname);
  let binDir: string;
  switch (basename(currentDirectory)) {
    case "src":
    case "out":
      binDir = resolve(currentDirectory, '..', 'bin');
      break;
    default:
      throw Error(
        `ExeRunner: cannot resolve binDir running from this location: ${dirname}`
      );
  }

  return resolve(binDir, ...relativePath);
}
