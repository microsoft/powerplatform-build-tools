const { resolve } = require("path");
const find = require("find");

const tasks = find.fileSync(/tasks[/\\].*[/\\]index.ts$/, "src");

module.exports = tasks.map((task) => ({
  entry: `./${task}`,
  target: "node",
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
    extensions: [".ts", ".js"],
  },
  output: {
    filename: task.replace(/\.ts$/, ".js").replace(/src[/\\]/, ""),
    path: resolve(__dirname, "dist"),
  },
}));
