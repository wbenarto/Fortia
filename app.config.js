export default {
	expo: {
		name: 'Fortia',
		slug: 'fortia',
		extra: {
			openaiAPIKey: process.env.OPENAI_API_KEY,
		},
		platforms: ['ios', 'web'],
		entryPoint: 'app/index.tsx',
		version: '1.0.0',
		orientation: 'portrait',
		icon: './assets/images/icon.png',
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
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/images/icon.png',
				backgroundColor: '#262135',
			},
		},
		web: {
			bundler: 'metro',
			output: 'server',
			favicon: './assets/images/icon.png',
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
