const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for image formats
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif');

// Exclude WebP format to prevent issues
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'webp');

// Native-only packages get a stand-in on web, so the server bundle for the
// API routes (web.output: 'server') can build. iOS resolves normally.
const WEB_STUBS = {
	'react-native-pager-view': path.resolve(__dirname, 'lib/stubs/pager-view.web.js'),
};
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
	if (platform === 'web' && WEB_STUBS[moduleName]) {
		return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] };
	}
	return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
