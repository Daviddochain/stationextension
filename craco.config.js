const webpack = require("webpack")

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve = config.resolve || {}
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
        vm: require.resolve("vm-browserify"),
        process: require.resolve("process/browser.js"),
      }

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        process: require.resolve("process/browser.js"),
        "process/browser": require.resolve("process/browser.js"),
      }

      config.plugins = [
        ...(config.plugins || []),
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: require.resolve("process/browser.js"),
        }),
      ]

      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Failed to parse source map/,
      ]

      config.module = config.module || {}
      config.module.rules = config.module.rules || []

      config.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      })

      config.optimization = {
        ...(config.optimization || {}),
        splitChunks: {
          minSize: 20000,
          maxSize: 4000000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          enforceSizeThreshold: 50000,
          cacheGroups: {
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
    },
  },
}