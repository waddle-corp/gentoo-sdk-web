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
      floatingCafe24: './src/floating-sdk-cafe24-glacier.js',
    },
    output: {
      path: path.resolve(__dirname, 'dist/cafe24'),
      filename: 'floating-sdk-cafe24-glacier.js',
      library: 'floating-sdk-cafe24-glacier',
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
