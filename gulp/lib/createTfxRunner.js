const { resolve } = require("path");
const { createCommandRunner } = require("@microsoft/powerplatform-cli-wrapper");

module.exports = function createTfxRunner() {
  const rootDirectory = resolve(__dirname, "..", "..");
  const tfxPath = resolve(
    rootDirectory,
    "node_modules",
    "tfx-cli",
    "_build",
    "tfx-cli.js"
  );
  const runCommand = createCommandRunner(rootDirectory, "node", console, 'gulp');

  return {
    createExtension: async function (createExtensionOptions) {
      const args = [tfxPath, "extension", "create"];
      if (createExtensionOptions) {
        if ("root" in createExtensionOptions) {
          args.push("--root", createExtensionOptions.root);
        }
        if ("manifests" in createExtensionOptions) {
          args.push("--manifests", ...createExtensionOptions.manifests);
        }
        if ("outputPath" in createExtensionOptions) {
          args.push("--output-path", createExtensionOptions.outputPath);
        }
      }
      return await runCommand(...args);
    },
  };
};
