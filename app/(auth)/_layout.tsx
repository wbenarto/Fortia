import { Stack } from 'expo-router';

const Layout = () => {
	return (
		<Stack>
			<Stack.Screen name="onboarding" options={{ headerShown: false }} />
			<Stack.Screen name="onboarding-setup" options={{ headerShown: false }} />
			<Stack.Screen name="sign-up" options={{ headerShown: false }} />
			<Stack.Screen name="sign-in" options={{ headerShown: false }} />
		</Stack>
	);
};

export default Layout;
