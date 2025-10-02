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
		version: '1.0.1',
		buildNumber: '60',
		orientation: 'portrait',
		icon: './assets/icons/fortia-white-icon.png',
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
			buildNumber: '60',
			icon: './assets/icons/fortia-white-icon.png',
			entitlements: {
				'com.apple.developer.healthkit': true,
				'com.apple.developer.healthkit.access': [],
			},
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSMotionUsageDescription:
					'Fortia uses Apple HealthKit and motion sensors to track your daily steps and physical activity for accurate fitness insights.',
				NSMicrophoneUsageDescription:
					'Fortia needs access to your microphone for audio recording features.',
				NSHealthShareUsageDescription:
					'Fortia uses Apple HealthKit to securely access your step count and activity data for personalized fitness tracking and calorie burn calculations.',
				NSHealthUpdateUsageDescription:
					'Fortia uses Apple HealthKit to record your fitness activities and workouts in your Health app for comprehensive health tracking.',
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
