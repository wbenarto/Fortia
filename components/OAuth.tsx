import React, { useCallback, useState } from 'react';
import { View, Text, Image, Alert, Platform } from 'react-native';
import { useOAuth, useUser, useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { icons } from '@/constants/index';
import CustomButton from '@/components/CustomButton';
import { googleOAuth, appleOAuth } from '@/lib/auth';
import { checkUserStatus } from '@/lib/userUtils';
import { AntDesign } from '@expo/vector-icons';

export default function OAuth() {
	const { startOAuthFlow: startGoogleOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
	const { startOAuthFlow: startAppleOAuthFlow } = useOAuth({ strategy: 'oauth_apple' });
	const { user } = useUser();
	const { getToken } = useAuth();
	const [isLoading, setIsLoading] = useState(false);

	// Helper function to wait for user object with retry logic
	const waitForUser = async (maxAttempts = 6, delay = 200): Promise<boolean> => {
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			if (user) {
				return true;
			}

			await new Promise(resolve => setTimeout(resolve, delay));
		}
		return false;
	};

	// Alternative method to get user data from session token
	const getUserFromSession = async () => {
		try {
			const token = await getToken();
			if (token) {
				// Decode the JWT token to get user info
				const payload = JSON.parse(atob(token.split('.')[1]));
				return {
					userId: payload.sub,
					email: payload.email || '',
					firstName: payload.given_name || '',
					lastName: payload.family_name || '',
				};
			}
		} catch (error) {
			console.error('Failed to get user from session token:', error);
		}
		return null;
	};

	const handleGoogleSignIn = useCallback(async () => {
		if (isLoading) return; // Prevent multiple simultaneous requests

		setIsLoading(true);
		try {
			// Check if user is already signed in before starting OAuth
			if (user) {
				// User is already signed in, check their status instead of starting new OAuth
				const userStatus = await checkUserStatus(user.id);

				if (userStatus.success) {
					if (userStatus.needsOnboarding) {
						router.push('/(auth)/onboarding-setup');
					} else {
						router.push('/(root)/(tabs)/home');
					}
					return;
				}
			}

			// Step 1: Complete OAuth flow
			const oauthResult = await googleOAuth(startGoogleOAuthFlow);

			if (!oauthResult.success) {
				// Handle specific OAuth errors
				if (oauthResult.code === 'user_canceled') {
					return; // Don't show error for cancellation
				} else {
					Alert.alert('Error', oauthResult.message || 'Authentication failed');
					return;
				}
			}

			// Step 2: Get user data with optimized fallback mechanism

			let userData = null;

			// First try: Check if user object is immediately available
			if (user) {
				userData = {
					userId: user.id,
					email: user.emailAddresses[0]?.emailAddress || '',
					firstName: user.firstName || '',
					lastName: user.lastName || '',
				};
			}

			// If not immediately available, try session token first (faster)
			if (!userData) {
				userData = await getUserFromSession();
				if (userData) {
				}
			}

			// Last resort: Wait for user object with shorter timeout
			if (!userData) {
				const userAvailable = await waitForUser();
				if (userAvailable && user) {
					userData = {
						userId: user.id,
						email: user.emailAddresses[0]?.emailAddress || '',
						firstName: user.firstName || '',
						lastName: user.lastName || '',
					};
				}
			}

			// If still no user data, show error
			if (!userData) {
				console.error('No user data available after OAuth completion');
				Alert.alert(
					'Connection Issue',
					'Please wait a moment and try signing in again. This usually resolves quickly.'
				);
				return;
			}

			// Step 3: Check user status in database (ONLY CHECK, NO CREATION)

			const userStatus = await checkUserStatus(userData.userId);

			if (userStatus.success) {
				if (userStatus.code === 'success') {
					// User exists and has completed onboarding

					router.push('/(root)/(tabs)/home');
				} else if (userStatus.code === 'needs_onboarding') {
					// User exists but needs onboarding

					router.push('/(auth)/onboarding-setup');
				} else {
					// Other success case, redirect to home

					router.push('/(root)/(tabs)/home');
				}
			} else if (userStatus.code === 'user_not_found') {
				// User doesn't exist - redirect to onboarding to collect all info
				// NO USER CREATION HERE - only redirect to onboarding

				router.push('/(auth)/onboarding-setup');
			} else {
				// Error case

				Alert.alert('Error', userStatus.message || 'Failed to check user status');
			}
		} catch (err) {
			console.error('OAuth component error:', err);
			console.error('Error type:', typeof err);
			console.error('Error message:', err instanceof Error ? err.message : 'Unknown error');

			// Handle "already signed in" error specifically
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			if (
				errorMessage.includes('already signed in') ||
				errorMessage.includes("You're already signed in")
			) {
				// User is already signed in, redirect them appropriately
				if (user) {
					const userStatus = await checkUserStatus(user.id);
					if (userStatus.success) {
						if (userStatus.needsOnboarding) {
							router.push('/(auth)/onboarding-setup');
						} else {
							router.push('/(root)/(tabs)/home');
						}
						return;
					}
				}
				// Fallback: redirect to home
				router.push('/(root)/(tabs)/home');
				return;
			}

			// TestFlight debugging - show detailed error for other cases
			Alert.alert(
				'TestFlight Debug - OAuth Error',
				`Error: ${errorMessage}\n\nType: ${typeof err}\n\nPlease report this error.`
			);
		} finally {
			setIsLoading(false);
		}
	}, [user, isLoading]);

	const handleAppleSignIn = useCallback(async () => {
		if (isLoading) return; // Prevent multiple simultaneous requests

		setIsLoading(true);
		try {
			// Check if user is already signed in before starting OAuth
			if (user) {
				// User is already signed in, check their status instead of starting new OAuth
				const userStatus = await checkUserStatus(user.id);

				if (userStatus.success) {
					if (userStatus.needsOnboarding) {
						router.push('/(auth)/onboarding-setup');
					} else {
						router.push('/(root)/(tabs)/home');
					}
					return;
				}
			}

			const result = await appleOAuth(startAppleOAuthFlow);

			if (result.success) {
				// For Apple Sign In, we can proceed directly since the result already contains user status

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
		} finally {
			setIsLoading(false);
		}
	}, [isLoading]);

	return (
		<View>
			<View className="flex flex-row justify-center items-center mt-4 gap-x-3">
				<View className="flex-1 h-[1px] bg-general-100"></View>
				<Text className="text-sm text-black">or continue with</Text>
				<View className="flex-1 h-[1px] bg-general-100"></View>
			</View>

			<CustomButton
				title={isLoading ? 'Signing In...' : 'Google'}
				className="mt-5 w-full shadow-none bg-white rounded-2xl"
				IconLeft={() => (
					<Image source={icons.Google} resizeMode="contain" className="w-5 h-5 mx-2" />
				)}
				bgVariant="outline"
				onPress={handleGoogleSignIn}
				textVariant="black"
				textProp="ml-4"
				disabled={isLoading}
			/>

			{Platform.OS === 'ios' && (
				<CustomButton
					title={isLoading ? 'Signing In...' : 'Apple'}
					className="mt-3 w-full shadow-none bg-white rounded-2xl"
					IconLeft={() => <AntDesign name="apple1" size={24} color="black" />}
					bgVariant="outline"
					onPress={handleAppleSignIn}
					textVariant="black"
					textProp="ml-4"
					disabled={isLoading}
				/>
			)}
		</View>
	);
}
