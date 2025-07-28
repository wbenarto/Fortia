const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for image formats
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif');

// Exclude WebP format to prevent issues
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'webp');

module.exports = config;
