var webpack = require('webpack');
module.exports = {
  entry: "./src/main.js",
  output: {
    path: __dirname,
    filename: "./public/js/<%= pkg.name %>.js"
  },
  module: {
    loaders: [
    {test: /\.css$/, loader: "style!css"}
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: "jquery",
      $: "jquery"
    })
  ]
};
