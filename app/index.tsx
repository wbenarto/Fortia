import { View, Text, StyleSheet, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { NativeWindStyleSheet } from 'nativewind';
import { useAuth } from '@clerk/clerk-expo';

NativeWindStyleSheet.setOutput({
	default: 'native',
});

const Home = () => {
	const { isSignedIn } = useAuth();

	if (Platform.OS === 'ios') {
		// iOS specific code
	}

	if (isSignedIn) {
		return <Redirect href={'/(root)/(tabs)/home'} />;
	}

	return <Redirect href="/(auth)/onboarding" />;
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: 'lightblue',
		marginTop: 20,
		height: 100,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 20,
	},
});

export default Home;
