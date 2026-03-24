const webpack = require("webpack")

module.exports = function override(config) {
  config.resolve = config.resolve || {}
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
    vm: require.resolve("vm-browserify"),
  }

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ]

  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    /Failed to parse source map/,
  ]

  config.optimization = {
    ...(config.optimization || {}),
    splitChunks: {
      ...(config.optimization?.splitChunks || {}),
      minSize: 20000,
      maxSize: 4000000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        ...(config.optimization?.splitChunks?.cacheGroups || {}),
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
  }

  return config
}