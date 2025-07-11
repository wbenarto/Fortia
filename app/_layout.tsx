import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { tokenCache } from '@/lib/auth';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { Slot } from 'expo-router';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(['Clerk:']);

export default function RootLayout() {
	const [loaded] = useFonts({
		'Jakarta-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
		'Jakarta-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
		'Jakarta-ExtraLight': require('../assets/fonts/PlusJakartaSans-ExtraLight.ttf'),
		'Jakarta-Light': require('../assets/fonts/PlusJakartaSans-Light.ttf'),
		'Jakarta-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
		'Jakarta-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
		'Jakarta-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
	});

	if (!publishableKey) {
		throw new Error(
			'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
		);
	}

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync();
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
				<ClerkLoaded>
					<Stack>
						<Stack.Screen name="index" options={{ headerShown: false }} />
						<Stack.Screen name="(auth)" options={{ headerShown: false }} />
						<Stack.Screen name="(root)" options={{ headerShown: false }} />
						<Stack.Screen name="+not-found" />
					</Stack>
				</ClerkLoaded>
			</ClerkProvider>
		</GestureHandlerRootView>
	);
}
