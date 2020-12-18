var webpack = require('webpack');
var TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',

  entry: "./src/main.js",
  output: {
    path: __dirname,
    filename: "./public/js/<%= pkg.name %>.js"
  },
  module: {
    rules: [
    {test: /\.css$/, loader: "style!css"}
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: "jquery",
      $: "jquery"
    })
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 6
        }
      })
    ]
  }
};
