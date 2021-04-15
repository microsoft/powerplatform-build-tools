const { Compilation, sources } = require("webpack");

module.exports = class EnvRequirePlugin {
  constructor(...modules) {
    this.modules = modules;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap("EnvRequirePlugin", (compilation) =>
      compilation.hooks.processAssets.tap(
        {
          name: "EnvRequirePlugin",
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          for (const fileName in assets) {
            const asset = compilation.getAsset(fileName);
            const originalSource = asset.source.source();
            const updatedSource = this.modules.reduce(
              (currentSource, moduleName) =>
                currentSource.replace(
                  `require("${moduleName}")`,
                  `require(\`\${process.env.POWERPLATFORM_BUILD_TOOLS_NODE_MODULES}/${moduleName}\`)`
                ),
              originalSource
            );
            compilation.updateAsset(
              fileName,
              new sources.RawSource(updatedSource)
            );
          }
        }
      )
    );
  }
};
