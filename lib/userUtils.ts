import { useUser } from '@clerk/clerk-expo';
import { useState, useEffect } from 'react';
import { fetchAPI } from './fetch';

export interface UserProfile {
	id: string;
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	imageUrl?: string;
	isLoaded: boolean;
	isSignedIn: boolean;
	// Database-specific fields
	weight?: number;
	height?: number;
	targetWeight?: number;
	startingWeight?: number;
	fitnessGoal?: string;
	dailyCalories?: number;
	dailyProtein?: number;
	dailyCarbs?: number;
	dailyFats?: number;
}

// Global refresh trigger
let refreshTrigger = 0;
const refreshListeners: (() => void)[] = [];

export const triggerUserProfileRefresh = () => {
	refreshTrigger++;
	refreshListeners.forEach(listener => listener());
};

/**
 * Custom hook that combines Clerk user data with database user data
 * Provides reliable access to user information throughout the app
 */
export const useUserProfile = (): UserProfile & { refresh: () => void } => {
	const { user, isLoaded, isSignedIn } = useUser();
	const [dbUserData, setDbUserData] = useState<any>(null);
	const [isDbLoaded, setIsDbLoaded] = useState(false);
	const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

	const fetchDbUserData = async () => {
		if (!user?.id || !isSignedIn) {
			setIsDbLoaded(true);
			return;
		}

		try {
			const response = await fetchAPI(`/api/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				setDbUserData(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch user data from database:', error);
		} finally {
			setIsDbLoaded(true);
		}
	};

	// Fetch user data from database when Clerk user is available
	useEffect(() => {
		fetchDbUserData();
	}, [user?.id, isSignedIn, localRefreshTrigger]);

	// Listen for global refresh triggers
	useEffect(() => {
		const handleRefresh = () => {
			setLocalRefreshTrigger(prev => prev + 1);
		};

		refreshListeners.push(handleRefresh);
		return () => {
			const index = refreshListeners.indexOf(handleRefresh);
			if (index > -1) {
				refreshListeners.splice(index, 1);
			}
		};
	}, []);

	const refresh = () => {
		setLocalRefreshTrigger(prev => prev + 1);
	};

	// Combine Clerk data with database data
	const combinedUser: UserProfile = {
		id: user?.id || '',
		// Use database data as primary source, fallback to Clerk data
		firstName: dbUserData?.first_name || user?.firstName || '',
		lastName: dbUserData?.last_name || user?.lastName || '',
		fullName:
			dbUserData?.first_name && dbUserData?.last_name
				? `${dbUserData.first_name} ${dbUserData.last_name}`
				: user?.fullName || '',
		email: dbUserData?.email || user?.emailAddresses?.[0]?.emailAddress || '',
		imageUrl: user?.imageUrl,
		isLoaded: isLoaded && isDbLoaded,
		isSignedIn: isSignedIn || false,
		// Database-specific fields
		weight: dbUserData?.weight,
		height: dbUserData?.height,
		targetWeight: dbUserData?.target_weight,
		startingWeight: dbUserData?.starting_weight,
		fitnessGoal: dbUserData?.fitness_goal,
		dailyCalories: dbUserData?.daily_calories,
		dailyProtein: dbUserData?.daily_protein,
		dailyCarbs: dbUserData?.daily_carbs,
		dailyFats: dbUserData?.daily_fats,
	};

	return {
		...combinedUser,
		refresh,
	};
};

/**
 * Get user's display name with fallbacks
 */
export const getUserDisplayName = (userProfile: UserProfile): string => {
	if (!userProfile.isLoaded) return 'Loading...';
	if (!userProfile.isSignedIn) return 'Guest';
	if (userProfile.firstName) return userProfile.firstName;
	if (userProfile.fullName) return userProfile.fullName;
	return 'User';
};

/**
 * Get user's initials for avatar display
 */
export const getUserInitials = (userProfile: UserProfile): string => {
	if (!userProfile.isLoaded) return '...';
	if (!userProfile.isSignedIn) return 'G';
	if (userProfile.firstName && userProfile.lastName) {
		return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase();
	}
	if (userProfile.firstName) {
		return userProfile.firstName[0].toUpperCase();
	}
	if (userProfile.fullName) {
		const names = userProfile.fullName.split(' ');
		if (names.length >= 2) {
			return `${names[0][0]}${names[1][0]}`.toUpperCase();
		}
		return names[0][0].toUpperCase();
	}
	return 'U';
};

// Response codes for consistent handling
export const RESPONSE_CODES = {
	SUCCESS: 'success',
	NEEDS_ONBOARDING: 'needs_onboarding',
	USER_NOT_FOUND: 'user_not_found',
	USER_CREATION_FAILED: 'user_creation_failed',
	ERROR: 'error',
	USER_FOUND: 'user_found',
	USER_NEEDS_ONBOARDING: 'user_needs_onboarding',
} as const;

// User status interface
export interface UserStatus {
	success: boolean;
	code: string;
	data?: any;
	needsOnboarding?: boolean;
	message?: string;
}

/**
 * Check if user has completed onboarding
 * Safe null-checking for onboarding completion
 */
export function hasCompletedOnboarding(userData: any): boolean {
	if (!userData) return false;
	return !!(userData.weight && userData.height && userData.fitness_goal);
}

/**
 * Validate user data structure
 */
export function validateUserData(userData: any): boolean {
	if (!userData) return false;
	return !!(userData.clerk_id && userData.email);
}

/**
 * Check user status in database with proper error handling
 */
export async function checkUserStatus(clerkId: string): Promise<UserStatus> {
	try {
		const result = await fetchAPI(`/api/user?clerkId=${clerkId}`, {
			method: 'GET',
		});

		if (!result.success) {
			return {
				success: false,
				code: RESPONSE_CODES.ERROR,
				message: result.error || 'Failed to check user status',
			};
		}

		// Handle different response codes
		switch (result.code) {
			case 'user_found':
			case 'success':
				return {
					success: true,
					code: RESPONSE_CODES.SUCCESS,
					data: result.data,
					needsOnboarding: false,
				};

			case 'needs_onboarding':
			case 'user_needs_onboarding':
				// If data is null, it means user doesn't exist
				if (!result.data) {
					return {
						success: true,
						code: RESPONSE_CODES.USER_NOT_FOUND,
						data: null,
						needsOnboarding: undefined,
					};
				}
				// If data exists, user needs onboarding
				return {
					success: true,
					code: RESPONSE_CODES.NEEDS_ONBOARDING,
					data: result.data,
					needsOnboarding: true,
				};

			case 'user_not_found':
				return {
					success: true,
					code: RESPONSE_CODES.USER_NOT_FOUND,
					data: null,
					needsOnboarding: undefined,
				};

			default:
				return {
					success: false,
					code: RESPONSE_CODES.ERROR,
					message: `Unknown response code: ${result.code}`,
				};
		}
	} catch (error) {
		console.error('User status check failed:', error);
		return {
			success: false,
			code: RESPONSE_CODES.ERROR,
			message: 'Failed to check user status',
		};
	}
}

/**
 * Create user in database with proper error handling
 */
export async function createUserInDatabase(userData: {
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
}): Promise<UserStatus> {
	try {
		const response = await fetchAPI('/api/user', {
			method: 'POST',
			body: JSON.stringify(userData),
		});

		if (response.success) {
			return {
				success: true,
				code: RESPONSE_CODES.NEEDS_ONBOARDING,
				data: response.data,
				needsOnboarding: true,
				message: 'User created successfully',
			};
		} else {
			return {
				success: false,
				code: RESPONSE_CODES.USER_CREATION_FAILED,
				message: response.error || 'Failed to create user',
			};
		}
	} catch (error) {
		console.error('User creation failed:', error);
		return {
			success: false,
			code: RESPONSE_CODES.USER_CREATION_FAILED,
			message: 'Failed to create user profile',
		};
	}
}

/**
 * Handle user status and create user if needed
 */
export async function handleUserStatus(
	userStatus: UserStatus,
	oauthData: any
): Promise<UserStatus> {
	switch (userStatus.code) {
		case RESPONSE_CODES.SUCCESS:
			// User exists and has completed onboarding
			return {
				success: true,
				code: RESPONSE_CODES.SUCCESS,
				data: userStatus.data,
				needsOnboarding: false,
				message: 'You have successfully authenticated',
			};

		case RESPONSE_CODES.NEEDS_ONBOARDING:
			// User exists but needs onboarding
			return {
				success: true,
				code: RESPONSE_CODES.NEEDS_ONBOARDING,
				data: userStatus.data,
				needsOnboarding: true,
				message: 'Please complete your profile setup',
			};

		case RESPONSE_CODES.USER_NOT_FOUND:
			// User doesn't exist, create them
			return await createUserInDatabase({
				clerkId: oauthData.clerkId,
				firstName: oauthData.firstName || '',
				lastName: oauthData.lastName || '',
				email: oauthData.email,
			});

		default:
			// Error case
			return userStatus;
	}
}

/**
 * Get user's last name with fallbacks
 */
export const getUserLastName = (userProfile: UserProfile): string => {
	if (!userProfile.isLoaded) return '';
	if (!userProfile.isSignedIn) return '';
	return userProfile.lastName || '';
};
