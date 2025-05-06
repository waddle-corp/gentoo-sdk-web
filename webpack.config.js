const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // or 'development'
  entry: './floating-button-sdk.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'floating-button-sdk.js',
    library: 'GentooSDK',
    libraryTarget: 'umd',
    clean: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      SDK_ENV: JSON.stringify(process.env.SDK_ENV || 'dev'),
    }),
  ],
};