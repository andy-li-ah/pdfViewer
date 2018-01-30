const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextWebpackPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const isProduction = process.env.NODE_ENV === 'production';

const config = {
	entry: {
		main: './src/views/index.js',
		vendor: ['babel-polyfill', 'es5-shim', 'react']
	},
	output: {
		path: path.join(__dirname, isProduction ? 'dist' : 'public'),
		publicPath: 'http://localhost:8088/public/',
		filename: 'js/[name].[chunkhash].js',
		chunkFilename: 'js/[name].[chunkhash].js'
	},
	devtool: isProduction ? '' : 'source-map',
	module: {
		rules: [{
			test: /\.(jpg|png)$/,
			use: 'url-loader?limit=8192&name=img/[name].[hash:8].[ext]'
		}, {
			test: /\.css$/,
			use: ExtractTextWebpackPlugin.extract({
				use: ['style-loader', 'css-loader']
			})
		}, {
			test: /\.scss$/,
			use: ExtractTextWebpackPlugin.extract({
				use: ['css-loader', 'sass-loader']
			})
		}, {
			test: /\.html$/,
			use: 'html-withimg-loader'
		}, {
			test: /\.(jsx|js)$/,
			loader: 'babel-loader',
			exclude: /node_modules/,
			query: {
				cacheDirectory: true,
				presets: ['react', 'es2015']
			}
		}]
	},
	resolve: {
		extensions: ['.js', '.json', '.scss']
	},
	plugins: [
		new CopyWebpackPlugin([{
			from: path.join(__dirname, './src/files'),
			to: path.join(__dirname, isProduction ? "/dist/files" : "/public/files"),
			toType: 'dir'
		}]),
		new webpack.DefinePlugin({
			'process.env': {
				'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
			}
		}),
		new webpack.optimize.CommonsChunkPlugin({
			names: ['vendor', 'mainfest']
		}),
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './src/views/index.html',
			chunks: ['mainfest', 'vendor', 'main'],
			chunksSortMode: 'dependency',
			inject: 'body',
			minify: {
				removeComments: false,
				collapseWhitespance: false
			}
		}),
		new ExtractTextWebpackPlugin('css/[name].[chunkhash].css', {
			disable: false,
			allChunks: true
		})
	]
};

module.exports = config;