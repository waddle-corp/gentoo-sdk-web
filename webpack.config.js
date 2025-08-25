const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    const envFile = mode === 'development' ? '.env.development' : '.env.production';
    const envVars = dotenv.config({ path: envFile }).parsed || {};

    const envKeys = Object.keys(envVars).reduce((acc, key) => {
        acc[`process.env.${key}`] = JSON.stringify(envVars[key] || '');
        return acc;
    }, {});

    const targets = [
        { name: 'floating', entry: './src/floating-sdk.js', output: 'gentoo' },
        { name: 'floating-cafe24-glacier', entry: './src/floating-sdk-cafe24-glacier.js', output: 'cafe24' },
        { name: 'floating-godomall', entry: './src/floating-sdk-godomall.js', output: 'godomall' },
        { name: 'gentoo-logger', entry: './src/logger.js', output: 'logger' },
    ];

    return targets.map(t => ({
        name: t.name,
        mode,
        entry: { [t.name]: t.entry },
        output: {
            path: path.resolve(__dirname, 'dist', t.output),
            filename: `${t.name}.js`,
            library: { type: 'umd', name: t.name },
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
        optimization: {
            splitChunks: false,
            runtimeChunk: false,
            minimize: mode === 'production',
        },
    }));
};