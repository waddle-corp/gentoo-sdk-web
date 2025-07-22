const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // or 'development'
  entry: {
    'gentoo-floating-sdk': './src/gentoo-sdk.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'floating-button-sdk.js',
    library: 'gentoo-floating-sdk',
    libraryTarget: 'umd',
    clean: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      SDK_ENV: JSON.stringify(process.env.SDK_ENV || 'dev'),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
