export default {
	expo: {
		name: 'Fortia',
		slug: 'fortia',
		extra: {
			eas: {
				projectId: '061a67d8-c8d4-4d24-b007-4c4b50e330ee',
			},
			geminiAPIKey: process.env.GEMINI_API_KEY,
		},
		platforms: ['ios', 'web'],
		entryPoint: 'app/index.tsx',
		version: '1.0.0',
		orientation: 'portrait',
		icon: './assets/images/logo-main-fortia-1.png',
		scheme: 'Fortia',
		userInterfaceStyle: 'automatic',
		splash: {
			image: './assets/images/logo-main-fortia-1.png',
			resizeMode: 'contain',
			backgroundColor: '#E3BBA1',
		},
		newArchEnabled: true,
		ios: {
			supportsTablet: true,
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSMotionUsageDescription:
					'Fortia needs access to motion and fitness data to track your daily steps for better fitness insights.',
				NSMicrophoneUsageDescription:
					'Fortia needs access to your microphone for audio recording features.',
			},
			bundleIdentifier: 'com.fortia.app',
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/images/logo-main-fortia-1.png',
				backgroundColor: '#E3BBA1',
			},
		},
		web: {
			bundler: 'metro',
			output: 'server',
			favicon: './assets/images/favicon.png',
		},
		plugins: [
			[
				'expo-router',
				{
					origin: 'https://fortia.com/',
				},
			],
			'expo-apple-authentication',
			'expo-secure-store',
			// Add expo-av plugin configuration
			[
				'expo-av',
				{
					microphonePermission: false,
				},
			],
		],
		experiments: {
			typedRoutes: true,
		},
	},
};
