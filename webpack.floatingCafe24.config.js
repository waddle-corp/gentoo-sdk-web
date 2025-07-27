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
      floatingButtonCafe24: './src/floating-button-sdk-cafe24.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist/cafe24'),
      filename: 'floating-button-sdk-cafe24.js',
      library: 'floating-button-sdk-cafe24',
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
