const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  const mode = argv.mode || 'development';
  const envFile = mode === 'development' ? '.env.development' : '.env.production';
  const envVars = dotenv.config({ path: envFile }).parsed || {};

  const envKeys = Object.keys(envVars).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(envVars[next] || '');
    return prev;
  }, {});

  return {
    mode: mode,
    entry: {
      floating: './src/floating-sdk.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist/gentoo'),
      filename: 'floating-sdk.js',
      library: 'floating-sdk',
      libraryTarget: 'umd',
      clean: true,
    },
    plugins: [
      new webpack.DefinePlugin({
        ...envKeys,
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
};
