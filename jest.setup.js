// Mock React Native BackHandler FIRST - before any other modules
jest.mock('react-native', () => {
	const RN = jest.requireActual('react-native');
	return {
		...RN,
		BackHandler: {
			addEventListener: jest.fn(() => ({ remove: jest.fn() })),
			removeEventListener: jest.fn(),
			exitApp: jest.fn(),
		},
	};
});

// Mock expo-router specifically
jest.mock('expo-router', () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		back: jest.fn(),
	}),
	useFocusEffect: jest.fn(callback => callback()),
	Link: 'Link',
	Stack: 'Stack',
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
	default: {
		manifest: {
			extra: {
				clerkPublishableKey: 'test_key',
			},
		},
	},
}));

jest.mock('expo-secure-store', () => ({
	getItemAsync: jest.fn(),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
	authenticateAsync: jest.fn(),
	hasHardwareAsync: jest.fn(),
	isEnrolledAsync: jest.fn(),
}));

// Mock Clerk
jest.mock('@clerk/clerk-expo', () => ({
	useAuth: () => ({
		isLoaded: true,
		isSignedIn: true,
		signOut: jest.fn(),
	}),
	useUser: () => ({
		isLoaded: true,
		isSignedIn: true,
		user: {
			id: 'test_user_id',
			firstName: 'Test',
			lastName: 'User',
		},
	}),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
	setItem: jest.fn(),
	getItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
	const Reanimated = require('react-native-reanimated/mock');
	Reanimated.default.call = () => {};
	return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
	const View = require('react-native/Libraries/Components/View/View');
	return {
		Swipeable: View,
		DrawerLayout: View,
		State: {},
		ScrollView: View,
		Slider: View,
		Switch: View,
		TextInput: View,
		RotationGestureHandler: View,
		Directions: {},
	};
});

global.fetch = jest.fn();
