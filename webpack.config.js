const { resolve } = require("path");
const nodeExternals = require("webpack-node-externals");
const find = require("find");

const tasks = find.fileSync(/tasks[\/\\].*[\/\\]index.ts$/, "src");

module.exports = tasks.map((task) => ({
  entry: `./${task}`,
  target: "node",
  externals: [nodeExternals()],
  externalsPresets: { node: true },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: [/out/],
      },
    ],
  },
  mode: "development",
  // mode: "production",
  resolve: {
    extensions: [".ts"],
    fallback: {
      os: false,
      path: false,
      child_process: false,
      fs: false,
      crypto: false,
    },
  },
  output: {
    filename: task.replace(/\.ts$/, ".js").replace(/src\//, ""),
    path: resolve(__dirname, "dist"),
  },
}));
