const { env } = require("process");
const { resolve } = require("path");
const nodeExternals = require("webpack-node-externals");
const find = require("find");
const EnvRequirePlugin = require("./EnvRequirePlugin");

const tasks = find.fileSync(/tasks[\/\\].*[\/\\]index.ts$/, "src");

module.exports = tasks.map((task) => ({
  entry: `./${task}`,
  target: "node",
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: [/node_modules/, /out/],
      },
    ],
  },
  plugins: [
    new EnvRequirePlugin(
      "@microsoft/powerplatform-cli-wrapper",
      "azure-pipelines-task-lib"
    ),
  ],
  mode: "production",
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: task.replace(/\.ts$/, ".js").replace(/src\//, ""),
    path: resolve(__dirname, "dist"),
  },
}));
