export default {
	expo: {
		name: 'Fortia',
		slug: 'fortia',
		extra: {
			eas: {
				projectId: '061a67d8-c8d4-4d24-b007-4c4b50e330ee',
			},
		},
		platforms: ['ios', 'web'],
		entryPoint: 'app/index.tsx',
		version: '1.0.0',
		buildNumber: '1',
		orientation: 'portrait',
		icon: './assets/icons/fortia-app-icon-main.png',
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
			buildNumber: '1',
			icon: './assets/icons/fortia-app-icon-main.png',
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSMotionUsageDescription:
					'Fortia needs access to motion and fitness data to track your daily steps for better fitness insights.',
				NSMicrophoneUsageDescription:
					'Fortia needs access to your microphone for audio recording features.',
				NSHealthShareUsageDescription:
					'Fortia needs access to your health data to track steps and provide accurate fitness insights.',
				NSHealthUpdateUsageDescription:
					'Fortia needs permission to update your health data with your fitness activities.',
				NSAppTransportSecurity: {
					NSAllowsArbitraryLoads: false,
				},
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
