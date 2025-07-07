import { View, Text, Image, Alert } from 'react-native';
import { useCallback } from 'react';
import { useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { icons } from '@/constants/index';
import CustomButton from '@/components/CustomButton';
import { googleOAuth } from '@/lib/auth';

const OAuth = () => {
	const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

	const handleGoogleSignIn = useCallback(async () => {
		try {
			const result = await googleOAuth(startOAuthFlow);

			if (result.success) {
				if (result.code === 'success') {
					// User is authenticated and has completed onboarding
					router.push('/(root)/(tabs)/home');
				} else if (result.code === 'needs_onboarding') {
					// User is authenticated but needs to complete onboarding
					router.push('/(auth)/onboarding-setup');
				} else if (result.code === 'user_creation_failed' || result.code === 'user_check_failed') {
					// User creation or check failed, show error
					Alert.alert('Error', result.message || 'Failed to process user profile');
				} else {
					// Other success case, redirect to home
					router.push('/(root)/(tabs)/home');
				}
			} else {
				// Authentication failed
				Alert.alert('Error', result.message || 'Authentication failed');
			}
		} catch (err) {
			// See https://clerk.com/docs/custom-flows/error-handling
			// for more info on error handling
			console.error(JSON.stringify(err, null, 2));
			Alert.alert('Error', 'An unexpected error occurred during sign in');
		}
	}, []);

	return (
		<View>
			<View className="flex flex-row justify-center items-center mt-4 gap-x-3">
				<View className="flex-1 h-[1px] bg-general-100"></View>
				<Text className="text-lg text-white">Or</Text>
				<View className="flex-1 h-[1px] bg-general-100"></View>
			</View>

			<CustomButton
				title="Log In with Google"
				className="mt-5 w-full shadow-none"
				IconLeft={() => (
					<Image source={icons.Google} resizeMode="contain" className="w-5 h-5 mx-2" />
				)}
				bgVariant="outline"
				onPress={handleGoogleSignIn}
			/>
		</View>
	);
};

export default OAuth;
