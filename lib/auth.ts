import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';
import * as Linking from 'expo-linking';
import { fetchAPI } from '@/lib/fetch';

const createTokenCache = (): TokenCache => {
	return {
		getToken: async (key: string) => {
			try {
				const item = await SecureStore.getItemAsync(key);
				if (item) {
					// Key was used
				} else {
					// No values stored under key
				}
				return item;
			} catch (error) {
				console.error('secure store get item error: ', error);
				await SecureStore.deleteItemAsync(key);
				return null;
			}
		},
		saveToken: (key: string, token: string) => {
			return SecureStore.setItemAsync(key, token);
		},
	};
};

export const googleOAuth = async (startOAuthFlow: any) => {
	try {
		const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
			redirectUrl: Linking.createURL('/(root)/(tabs)/home', { scheme: 'myapp' }),
		});

		// If sign in was successful, set the active session
		if (createdSessionId) {
			if (setActive) {
				await setActive!({ session: createdSessionId });

				// Check if this is a new user (sign up) or existing user (sign in)
				if (signUp.createdUserId) {
					// This is a new user signing up with Google
					console.log('New Google OAuth user:', signUp.createdUserId);

					// Check if user already exists in our database
					try {
						const userCheckResponse = await fetch(`/(api)/user?clerkId=${signUp.createdUserId}`, {
							method: 'GET',
						});

						if (userCheckResponse.ok) {
							// User exists in database, check if they need onboarding
							const userCheck = await userCheckResponse.json();
							const userData = userCheck.data;
							if (userData.weight && userData.height && userData.fitness_goal) {
								// User has completed onboarding
								return {
									success: true,
									code: 'success',
									message: 'You have successfully authenticated',
									needsOnboarding: false,
								};
							} else {
								// User exists but hasn't completed onboarding
								return {
									success: true,
									code: 'needs_onboarding',
									message: 'Please complete your profile setup',
									needsOnboarding: true,
								};
							}
						} else if (userCheckResponse.status === 404) {
							// User doesn't exist in database, create them
							try {
								const userResponse = await fetchAPI('/(api)/user', {
									method: 'POST',
									body: JSON.stringify({
										firstName: signUp.firstName || '',
										lastName: signUp.lastName || '',
										email: signUp.emailAddress,
										clerkId: signUp.createdUserId,
									}),
								});

								if (userResponse.success) {
									// User created successfully, needs onboarding
									return {
										success: true,
										code: 'needs_onboarding',
										message: 'Please complete your profile setup',
										needsOnboarding: true,
									};
								} else {
									// User creation failed
									return {
										success: false,
										code: 'user_creation_failed',
										message: 'Failed to create user profile',
									};
								}
							} catch (userError) {
								console.error('User creation error:', userError);
								return {
									success: false,
									code: 'user_creation_failed',
									message: 'Failed to create user profile',
								};
							}
						} else {
							// Other error occurred
							console.error('User check failed with status:', userCheckResponse.status);
							return {
								success: false,
								code: 'user_check_failed',
								message: 'Failed to check user status',
							};
						}
					} catch (checkError) {
						console.error('User check error:', checkError);
						// If we can't check the user, assume they need onboarding
						return {
							success: true,
							code: 'needs_onboarding',
							message: 'Please complete your profile setup',
							needsOnboarding: true,
						};
					}
				} else if (signIn.userId) {
					// This is an existing user signing in with Google
					console.log('Existing Google OAuth user:', signIn.userId);

					// Check if user exists in our database and has completed onboarding
					try {
						console.log('Checking if existing user exists in database for clerkId:', signIn.userId);
						const userCheckResponse = await fetch(`/(api)/user?clerkId=${signIn.userId}`, {
							method: 'GET',
						});

						console.log('Existing user check response status:', userCheckResponse.status);

						if (userCheckResponse.ok) {
							// User exists in database, check if they need onboarding
							const userCheck = await userCheckResponse.json();
							const userData = userCheck.data;
							if (userData.weight && userData.height && userData.fitness_goal) {
								// User has completed onboarding
								return {
									success: true,
									code: 'success',
									message: 'You have successfully authenticated',
									needsOnboarding: false,
								};
							} else {
								// User exists but hasn't completed onboarding
								return {
									success: true,
									code: 'needs_onboarding',
									message: 'Please complete your profile setup',
									needsOnboarding: true,
								};
							}
						} else if (userCheckResponse.status === 404) {
							// User doesn't exist in database, create them
							try {
								const userResponse = await fetchAPI('/(api)/user', {
									method: 'POST',
									body: JSON.stringify({
										firstName: signIn.firstName || '',
										lastName: signIn.lastName || '',
										email: signIn.emailAddress,
										clerkId: signIn.userId,
									}),
								});

								if (userResponse.success) {
									// User created successfully, needs onboarding
									return {
										success: true,
										code: 'needs_onboarding',
										message: 'Please complete your profile setup',
										needsOnboarding: true,
									};
								} else {
									// User creation failed
									return {
										success: false,
										code: 'user_creation_failed',
										message: 'Failed to create user profile',
									};
								}
							} catch (userError) {
								console.error('User creation error:', userError);
								return {
									success: false,
									code: 'user_creation_failed',
									message: 'Failed to create user profile',
								};
							}
						} else {
							// Other error occurred
							console.error('User check failed with status:', userCheckResponse.status);
							return {
								success: false,
								code: 'user_check_failed',
								message: 'Failed to check user status',
							};
						}
					} catch (checkError) {
						console.error('User check error:', checkError);
						// If we can't check the user, assume they need onboarding
						return {
							success: true,
							code: 'needs_onboarding',
							message: 'Please complete your profile setup',
							needsOnboarding: true,
						};
					}
				}

				// Fallback for any other case
				return {
					success: true,
					code: 'success',
					message: 'You have successfully authenticated',
					needsOnboarding: false,
				};
			}
		}
		return {
			success: false,
			message: 'An error occured',
		};
	} catch (error: any) {
		console.error(error);
		return {
			success: false,
			code: error.code,
			message: error?.errors[0]?.longMessage,
		};
	}
};

// SecureStore is not supported on the web
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
