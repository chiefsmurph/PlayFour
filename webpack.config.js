var path = require('path');
var config = {
  entry: path.resolve(__dirname, 'public/app.jsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.jsx$/, // A regexp to test the require path. accepts either js or jsx
        loader: 'babel' // The module to load. "babel" is short for "babel-loader"
      },
      {
          test: /index\.html$/,
          loader: 'file?name=[name].[ext]'
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(png|jpg)$/,
        loader: 'file?name=[name].[ext]'
      } // inline base64 URLs for <=8k images, direct URLs for the rest
    ]
  }
};

module.exports = config;