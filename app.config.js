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
		version: '1.0.5',
		buildNumber: '61',
		orientation: 'portrait',
		icon: './assets/icons/fortia-icon-light.png',
		scheme: ['fortia'],
		userInterfaceStyle: 'automatic',
		splash: {
			image: './assets/images/logo-main-fortia-1.png',
			resizeMode: 'contain',
			backgroundColor: '#E3BBA1',
		},
		newArchEnabled: true,
		// Expo Updates configuration for OTA updates
		updates: {
			url: 'https://u.expo.dev/061a67d8-c8d4-4d24-b007-4c4b50e330ee',
		},
		runtimeVersion: '1.0.5',
		ios: {
			supportsTablet: true,
			buildNumber: '61',
			icon: {
				light: './assets/icons/fortia-icon-light.png',
				dark: './assets/icons/fortia-icon-dark.png',
			},
			entitlements: {
				'com.apple.developer.healthkit': true,
				'com.apple.developer.healthkit.access': [],
			},
			infoPlist: {
				ITSAppUsesNonExemptEncryption: false,
				NSMotionUsageDescription:
					'Fortia uses Apple HealthKit and motion sensors to track your daily steps and physical activity for accurate fitness insights.',
				NSCameraUsageDescription:
					'Fortia uses the camera to scan barcodes and photograph meals so you can log food faster.',
				NSPhotoLibraryUsageDescription:
					'Fortia lets you pick a meal photo from your library to log what you ate.',
				NSMicrophoneUsageDescription:
					'Fortia needs access to your microphone for audio recording features.',
				NSHealthShareUsageDescription:
					'Fortia uses Apple HealthKit to securely access your step count and activity data for personalized fitness tracking and calorie burn calculations.',
				NSHealthUpdateUsageDescription:
					'Fortia uses Apple HealthKit to record your fitness activities and workouts in your Health app for comprehensive health tracking.',
				NSAppTransportSecurity: {
					NSAllowsArbitraryLoads: false,
					NSAllowsLocalNetworking: true,
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
			// Barcode scanning + meal photos (no microphone: we never record video)
			[
				'expo-camera',
				{
					cameraPermission: 'Fortia uses the camera to scan barcodes and photograph meals so you can log food faster.',
					microphonePermission: false,
					recordAudioAndroid: false,
				},
			],
			[
				'expo-image-picker',
				{
					photosPermission: 'Fortia lets you pick a meal photo from your library to log what you ate.',
					cameraPermission: 'Fortia uses the camera to scan barcodes and photograph meals so you can log food faster.',
					microphonePermission: false,
				},
			],
			// Add expo-updates plugin for OTA updates
			'expo-updates',
		],
		experiments: {
			typedRoutes: true,
		},
		// Disable error overlay in development
		developer: {
			tool: 'expo-cli',
		},
	},
};
