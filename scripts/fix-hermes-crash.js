#!/usr/bin/env node

/**
 * Script to fix Hermes crash issues
 * Run this after making the configuration changes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Hermes crash issues...\n');

try {
	// 1. Clean node_modules and package-lock.json
	console.log('1. Cleaning node_modules and package-lock.json...');
	if (fs.existsSync('node_modules')) {
		execSync('rm -rf node_modules', { stdio: 'inherit' });
	}
	if (fs.existsSync('package-lock.json')) {
		execSync('rm package-lock.json', { stdio: 'inherit' });
	}

	// 2. Clean iOS build cache
	console.log('2. Cleaning iOS build cache...');
	if (fs.existsSync('ios')) {
		execSync('cd ios && rm -rf build && rm -rf Pods && rm Podfile.lock', { stdio: 'inherit' });
	}

	// 3. Clean Expo cache
	console.log('3. Cleaning Expo cache...');
	execSync('npx expo install --fix', { stdio: 'inherit' });

	// 4. Install dependencies
	console.log('4. Installing dependencies...');
	execSync('npm install', { stdio: 'inherit' });

	// 5. Install iOS pods
	console.log('5. Installing iOS pods...');
	if (fs.existsSync('ios')) {
		execSync('cd ios && pod install', { stdio: 'inherit' });
	}

	console.log('\n✅ Hermes crash fix completed!');
	console.log('\n📋 Next steps:');
	console.log('1. Run: npx expo run:ios --configuration Release');
	console.log('2. Test your app thoroughly');
	console.log(
		'3. If issues persist, consider temporarily disabling Hermes in ios/Fortia/Info.plist'
	);
	console.log('\n🔍 Key changes made:');
	console.log('- Set expo-image-picker quality to 1');
	console.log('- Pinned lottie-react-native to stable version 5.1.6');
	console.log('- Added explicit Hermes configuration');
	console.log('- Disabled new architecture (already done)');
} catch (error) {
	console.error('❌ Error during fix:', error.message);
	process.exit(1);
}
