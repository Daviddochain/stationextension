const path = require("path")
const webpack = require("webpack")

module.exports = {
  mode: "production",
  entry: {
    background: path.resolve(__dirname, "background.js"),
    content: path.resolve(__dirname, "contentScript.js"),
  },
  output: {
    path: path.resolve(__dirname, "../build"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".js", ".ts"],
    fallback: {
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer"),
      process: require.resolve("process/browser.js"),
      crypto: require.resolve("crypto-browserify"),
      vm: require.resolve("vm-browserify"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser.js",
    }),
  ],
}