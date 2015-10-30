var IndexHtmlPlugin = require('indexhtml-webpack-plugin');
var path = require('path');

module.exports = {
    context: path.resolve(__dirname, 'public'),
    entry: {
      'index.html': 'index.html',
      app: './app.jsx'
    },
    output: {
        filename: 'bundle.js', //this is the default name, so you can skip it
        //at this directory our bundle file will be available
        //make sure port 8090 is used when launching webpack-dev-server
        publicPath: 'http://localhost:8090/assets'
    },
    module: {
        loaders: [
            {
                //tell webpack to use jsx-loader for all *.jsx files
                test: /\.jsx$/,
                loader: 'jsx-loader?insertPragma=React.DOM&harmony'
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
              loader: 'url-loader?limit=8192'
            } // inline base64 URLs for <=8k images, direct URLs for the rest

        ]
    },
    externals: {
        //don't bundle the 'react' npm package with our bundle.js
        //but get it from a global 'React' variable
        'react': 'React'
    },
    resolve: {
        extensions: ['', '.js', '.jsx']
    },
    plugins: [
        new IndexHtmlPlugin('index.html', 'index.html')
    ]
}
