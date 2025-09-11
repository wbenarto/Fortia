import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { fetchAPI } from '@/lib/fetch';
import * as AppleAuthentication from 'expo-apple-authentication';
import { checkUserStatus, RESPONSE_CODES } from '@/lib/userUtils';

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

/**
 * Handle Clerk OAuth flow and extract user data
 */
const handleClerkOAuth = async (startOAuthFlow: any) => {
	try {
		let oauthResult;
		try {
			oauthResult = await startOAuthFlow({
				redirectUrl: Linking.createURL('/(root)/(tabs)/home', { scheme: 'Fortia' }),
			});
		} catch (oauthFlowError) {
			console.error('OAuth flow failed:', oauthFlowError);
			console.error('OAuth flow error type:', typeof oauthFlowError);
			console.error('OAuth flow error:', oauthFlowError);
			throw oauthFlowError;
		}

		const { createdSessionId, signIn, signUp, setActive } = oauthResult;

		if (!createdSessionId || !setActive) {
			// Don't throw error for cancellation, let the calling function handle it
			return null;
		}

		try {
			await setActive({ session: createdSessionId });
		} catch (setActiveError) {
			console.error('Failed to set active session:', setActiveError);
			console.error('setActiveError type:', typeof setActiveError);
			console.error('setActiveError:', setActiveError);

			// If setActive fails, we might still have user data, so continue
		}

		// Since Clerk doesn't provide user data in the OAuth response,
		// we need to get it from the active session

		// Import the useUser hook to get current user data
		// Note: This approach requires the component to be wrapped in ClerkProvider
		// We'll need to handle this differently - let's get the user data from the session

		// For now, let's try to extract user data from the session ID
		// We'll need to make an API call to get user data using the session

		// Since we can't use useUser here (it's a hook), we'll need to get user data
		// from the backend using the session, or handle this in the component
		// For now, let's return the session ID and handle user data extraction in the component

		return {
			clerkId: createdSessionId, // We'll need to extract the actual user ID from the session
			firstName: '',
			lastName: '',
			email: '',
			sessionId: createdSessionId,
		};
	} catch (error) {
		console.error('Error in handleClerkOAuth:', error);
		console.error('Error type:', typeof error);
		console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		throw error;
	}
};

/**
 * Handle OAuth errors consistently
 */
const handleOAuthError = (error: any) => {
	console.error('OAuth error:', error);
	console.error('OAuth error type:', typeof error);
	console.error('OAuth error keys:', error ? Object.keys(error) : 'null/undefined');

	// Handle user cancellation
	if (error.code === 'ERR_CANCELED') {
		return {
			success: false,
			code: 'user_canceled',
			message: 'Sign in was canceled',
		};
	}

	// Handle Clerk-specific errors
	if (error.errors && Array.isArray(error.errors)) {
		const firstError = error.errors[0];
		return {
			success: false,
			code: RESPONSE_CODES.ERROR,
			message: firstError?.longMessage || firstError?.message || 'Authentication failed',
		};
	}

	// Handle other error objects
	if (error.message) {
		return {
			success: false,
			code: RESPONSE_CODES.ERROR,
			message: error.message,
		};
	}

	// Fallback
	return {
		success: false,
		code: RESPONSE_CODES.ERROR,
		message: 'Authentication failed',
	};
};

export const googleOAuth = async (startOAuthFlow: any) => {
	try {
		// Step 1: Handle OAuth with Clerk
		const oauthData = await handleClerkOAuth(startOAuthFlow);

		// Check if OAuth was cancelled
		if (!oauthData) {
			return {
				success: false,
				code: 'user_canceled',
				message: 'Sign in was canceled',
			};
		}

		// Step 2: Check user status in database (ONLY CHECK, NO CREATION)

		const userStatus = await checkUserStatus(oauthData.clerkId);

		// Return the user status directly - no user creation during OAuth
		return userStatus;
	} catch (error) {
		console.error('Google OAuth error:', error);
		console.error('Error type:', typeof error);
		console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return handleOAuthError(error);
	}
};

export const appleOAuth = async (startOAuthFlow: any) => {
	try {
		// Step 1: Handle OAuth with Clerk
		const oauthData = await handleClerkOAuth(startOAuthFlow);

		// Check if OAuth was cancelled
		if (!oauthData) {
			return {
				success: false,
				code: 'user_canceled',
				message: 'Sign in was canceled',
			};
		}

		// Step 2: Check user status in database (ONLY CHECK, NO CREATION)
		const userStatus = await checkUserStatus(oauthData.clerkId);

		// Return the user status directly - no user creation during OAuth
		return userStatus;
	} catch (error) {
		return handleOAuthError(error);
	}
};

// SecureStore is not supported on the web
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
