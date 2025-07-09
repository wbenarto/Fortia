export default {
	expo: {
		name: 'Fortia',
		slug: 'fortia',
		extra: {
			geminiAPIKey: process.env.GEMINI_API_KEY,
		},
		platforms: ['ios', 'web'],
		entryPoint: 'app/index.tsx',
		version: '1.0.0',
		orientation: 'portrait',
		icon: './assets/images/favicon.png',
		scheme: 'Fortia',
		userInterfaceStyle: 'automatic',
		splash: {
			image: './assets/images/splash.png',
			resizeMode: 'contain',
			backgroundColor: '#262135',
		},
		newArchEnabled: true,
		ios: {
			supportsTablet: true,
			infoPlist: {
				NSMotionUsageDescription:
					'Fortia needs access to motion and fitness data to track your daily steps for better fitness insights.',
			},
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/images/favicon.png',
				backgroundColor: '#262135',
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
		],
		experiments: {
			typedRoutes: true,
		},
	},
};
