module.exports = {
  resolve: {
    fallback: {
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "util": require.resolve("util/"),
      "url": require.resolve("url/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "assert": require.resolve("assert/")
    }
  }
};