import React, { useCallback } from 'react';
import { View, Text, Image, Alert, Platform } from 'react-native';
import { useOAuth, useUser, useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { icons } from '@/constants/index';
import CustomButton from '@/components/CustomButton';
import { googleOAuth, appleOAuth } from '@/lib/auth';
import { checkUserStatus, handleUserStatus } from '@/lib/userUtils';
import { AntDesign } from '@expo/vector-icons';

export default function OAuth() {
	const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
	const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({ strategy: 'oauth_apple' });
	const { user } = useUser();
	const { getToken } = useAuth();

	const handleGoogleSignIn = useCallback(async () => {
		try {
			console.log('Google Sign In button pressed');
			console.log('startGoogleOAuthFlow type:', typeof startGoogleOAuthFlow);

			// Step 1: Complete OAuth flow
			const oauthResult = await googleOAuth(startGoogleOAuthFlow);
			console.log('OAuth result received:', oauthResult.success ? 'success' : 'failed');

			if (!oauthResult.success) {
				// Handle specific OAuth errors
				if (oauthResult.code === 'user_canceled') {
					console.log('OAuth was canceled by user');
					return; // Don't show error for cancellation
				} else {
					console.log('OAuth failed');
					Alert.alert('Error', oauthResult.message || 'Authentication failed');
					return;
				}
			}

			// Step 2: Get user data from active session
			console.log('Getting user data from active session...');

			// Get user data directly from the session token
			try {
				const token = await getToken();
				console.log('Got session token:', !!token);

				// Decode the JWT token to get user data
				if (token) {
					const tokenParts = token.split('.');
					if (tokenParts.length === 3) {
						const payload = JSON.parse(atob(tokenParts[1]));

						const userId = payload.sub; // User ID from token
						const email = payload.email;
						const firstName = payload.first_name || '';
						const lastName = payload.last_name || '';

						console.log('User data extracted from token - ID:', userId);

						// Step 3: Check user status in database using actual user ID
						console.log('Checking user status for:', userId);
						const userStatus = await checkUserStatus(userId);
						console.log('User status result:', userStatus.success ? 'success' : 'failed');

						// Step 4: Handle user status and create user if needed
						const finalResult = await handleUserStatus(userStatus, {
							clerkId: userId,
							firstName,
							lastName,
							email,
						});
						console.log('Final OAuth result:', finalResult.success ? 'success' : 'failed');

						if (finalResult.success) {
							if (finalResult.code === 'success') {
								// User is authenticated and has completed onboarding
								console.log('Redirecting to home (success)');
								router.push('/(root)/(tabs)/home');
							} else if (finalResult.code === 'needs_onboarding') {
								// User is authenticated but needs to complete onboarding
								console.log('Redirecting to onboarding');
								router.push('/(auth)/onboarding-setup');
							} else if (
								finalResult.code === 'user_creation_failed' ||
								finalResult.code === 'user_check_failed'
							) {
								// User creation or check failed, show error
								console.log('User creation/check failed');
								Alert.alert('Error', finalResult.message || 'Failed to process user profile');
							} else {
								// Other success case, redirect to home
								console.log('Redirecting to home (other success)');
								router.push('/(root)/(tabs)/home');
							}
						} else {
							// Authentication failed
							console.log('Authentication failed');
							Alert.alert('Error', finalResult.message || 'Authentication failed');
						}
					} else {
						throw new Error('Invalid token format');
					}
				} else {
					throw new Error('No token available');
				}
			} catch (sessionError) {
				console.error('Failed to get user data from session:', sessionError);
				Alert.alert('Error', 'Failed to get user data from session. Please try again.');
				return;
			}
		} catch (err) {
			// See https://clerk.com/docs/custom-flows/error-handling
			// for more info on error handling
			console.error('OAuth component error:', err);
			console.error('Error type:', typeof err);
			console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');
			Alert.alert('Error', 'An unexpected error occurred during sign in');
		}
	}, [user]);

	const handleAppleSignIn = useCallback(async () => {
		try {
			const result = await appleOAuth(startAppleOAuthFlow);

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
				// Handle specific Apple Sign In errors
				if (result.code === 'not_available') {
					Alert.alert('Not Available', 'Apple Sign In is not available on this device');
				} else if (result.code === 'user_canceled') {
					// User canceled, no need to show error
					return;
				} else {
					// Authentication failed
					Alert.alert('Error', result.message || 'Authentication failed');
				}
			}
		} catch (err) {
			console.error(JSON.stringify(err, null, 2));
			Alert.alert('Error', 'An unexpected error occurred during sign in');
		}
	}, []);

	return (
		<View>
			<View className="flex flex-row justify-center items-center mt-4 gap-x-3">
				<View className="flex-1 h-[1px] bg-general-100"></View>
				<Text className="text-lg text-black">Or</Text>
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
				textVariant="black"
				textProp="ml-4"
			/>

			{Platform.OS === 'ios' && (
				<CustomButton
					title="Sign in with Apple"
					className="mt-3 w-full shadow-none "
					IconLeft={() => <AntDesign name="apple1" size={24} color="black" />}
					bgVariant="outline"
					onPress={handleAppleSignIn}
					textVariant="black"
					textProp="ml-4"
				/>
			)}
		</View>
	);
}
