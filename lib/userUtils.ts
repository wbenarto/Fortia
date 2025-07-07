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
			const response = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
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

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = (userProfile: UserProfile): boolean => {
	return !!(userProfile.weight && userProfile.height && userProfile.fitnessGoal);
};

/**
 * Get user's last name with fallbacks
 */
export const getUserLastName = (userProfile: UserProfile): string => {
	if (!userProfile.isLoaded) return '';
	if (!userProfile.isSignedIn) return '';
	return userProfile.lastName || '';
};
