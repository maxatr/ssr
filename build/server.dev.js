const webpack = require('webpack')
const serverConfig = require('./webpack.server.config')
const clientConfig = require('./webpack.client.config')
const memoryFs = require('memory-fs')
const path = require('path')
const middleware = require('webpack-dev-middleware')

module.exports = (app, templatePath, callback) => {
	let bundle
	let clientManifest
	let ready

	const readyPromise = new Promise((resolve, reject) => {
		ready = resolve
	})

	const update = () => {
		if (bundle && clientManifest) {
			callback(bundle, {
				template: templatePath,
				clientManifest
			})
		}
	}

	const clientCompiler = webpack(clientConfig)
	const devMiddleware = middleware(clientCompiler, {
		publicPath: clientConfig.output.publicPath
	})
	app.use(devMiddleware)

	clientCompiler.plugin('done', () => {
		ready()

		clientManifest = JSON.parse(
			devMiddleware.fileSystem.readFileSync(path.join(clientConfig.output.path, 'vue-ssr-client-manifest.json'), 'utf-8')
		)

		update()
	})

	const mfs = new memoryFs()
	const serverCompiler = webpack(serverConfig)

	serverCompiler.outputFileSystem = mfs
	serverCompiler.watch({}, () => {
		bundle = JSON.parse(
			mfs.readFileSync(path.join(clientConfig.output.path, 'vue-ssr-server-bundle.json'), 'utf-8')
		)

		update()
	})

	return readyPromise
}