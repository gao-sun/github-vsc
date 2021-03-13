/* eslint-disable @typescript-eslint/no-var-requires */
//@ts-check

'use strict';

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');

const getConfig = (_, { mode }) => {
  const isDevelopment = mode !== 'production';

  /**@type {import('webpack').Configuration}*/
  const config = {
    target: 'webworker',
    mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
    entry: {
      'control-panel': './src/control-panel/index.tsx',
      'terminal-app': './src/terminal-app/index.tsx',
    }, // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
      // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
    },
    devtool: 'nosources-source-map',
    externals: {
      vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
      // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
      extensions: ['.ts', '.js', '.tsx'],
      alias: {
        '@': path.resolve(__dirname, 'src/control-panel'),
        '@src': path.resolve(__dirname, 'src'),
        '@core': path.resolve(__dirname, 'src/core'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
            },
          ],
        },
        {
          test: /\.module\.s(a|c)ss$/,
          exclude: /node_modules/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                modules: {
                  // https://webpack.js.org/loaders/css-loader/#localidentname
                  localIdentName: isDevelopment ? '[path][name]__[local]' : '[hash:base64]',
                  localIdentContext: path.resolve(__dirname, 'src/control-panel'),
                },
                sourceMap: isDevelopment,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: isDevelopment,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevelopment,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(mode),
        IS_DEV: isDevelopment,
      }),
      new MiniCssExtractPlugin(),
    ],
  };

  return config;
};

module.exports = getConfig;
