import { calculateBMR } from './bmrUtils';
import { fetchAPI } from './fetch';

interface UserProfile {
	id: string;
	clerk_id: string;
	first_name: string;
	last_name: string;
	email: string;
	dob?: string;
	age?: number;
	weight?: number;
	height?: number;
	target_weight?: number;
	starting_weight?: number;
	gender?: string;
	activity_level?: string;
	fitness_goal?: string;
	daily_calories?: number;
	daily_protein?: number;
	daily_carbs?: number;
	daily_fats?: number;
	bmr?: number;
	tdee?: number;
	created_at: string;
	updated_at: string;
}

interface BMRCalculationResult {
	bmr: number;
	weight: number;
	height: number;
	age: number;
	gender: string;
	source: 'current_data' | 'defaults' | 'stored_bmr';
}

// Cache for BMR calculations to avoid repeated API calls
const bmrCache = new Map<string, BMRCalculationResult>();

/**
 * Generate cache key from user data
 */
const getBMRCacheKey = (
	clerkId: string,
	weight?: number,
	height?: number,
	age?: number,
	gender?: string
): string => {
	return `${clerkId}_${weight || 0}_${height || 0}_${age || 0}_${gender || 'unknown'}`;
};

/**
 * Clear BMR cache (useful for testing or when user data changes significantly)
 */
export const clearBMRCache = (): void => {
	bmrCache.clear();
};

/**
 * Clear BMR cache for specific user (when profile changes)
 */
export const clearBMRCacheForUser = (clerkId: string): void => {
	const keysToDelete = Array.from(bmrCache.keys()).filter(key => key.startsWith(`${clerkId}_`));
	keysToDelete.forEach(key => bmrCache.delete(key));
};

/**
 * Fetch user's current profile data from the database
 */
const fetchUserProfile = async (clerkId: string): Promise<UserProfile | null> => {
	try {
		const response = await fetchAPI(`/api/user?clerkId=${clerkId}`, {
			method: 'GET',
		});

		if (response.success && response.data) {
			return response.data;
		}
		return null;
	} catch (error) {
		console.error('Error fetching user profile for BMR calculation:', error);
		return null;
	}
};

/**
 * Calculate current age from date of birth
 */
const calculateCurrentAge = (dob: string): number => {
	const birthDate = new Date(dob);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}

	return age;
};

/**
 * Get user's latest weight from the weights table
 */
const fetchLatestWeight = async (clerkId: string): Promise<number | null> => {
	try {
		const response = await fetchAPI(`/api/weight?clerkId=${clerkId}&latest=true`, {
			method: 'GET',
		});

		if (response.success && response.data && response.data.length > 0) {
			return response.data[0].weight;
		}
		return null;
	} catch (error) {
		console.error('Error fetching latest weight for BMR calculation:', error);
		return null;
	}
};

/**
 * Unified BMR calculator that uses user's current data
 * This is the single source of truth for BMR calculations across the app
 */
export const calculateUnifiedBMR = async (clerkId: string): Promise<BMRCalculationResult> => {
	// Check cache first
	const cacheKey = getBMRCacheKey(clerkId);
	if (bmrCache.has(cacheKey)) {
		return bmrCache.get(cacheKey)!;
	}

	try {
		// Fetch user's current profile data
		const userProfile = await fetchUserProfile(clerkId);

		if (!userProfile) {
			throw new Error('User profile not found');
		}

		// Get latest weight from weights table
		const latestWeight = await fetchLatestWeight(clerkId);

		// Use latest weight if available, otherwise fall back to profile weight
		const currentWeight = latestWeight || userProfile.weight;

		// Calculate current age from date of birth
		let currentAge = userProfile.age;
		if (userProfile.dob && !currentAge) {
			currentAge = calculateCurrentAge(userProfile.dob);
		}

		// Get current height and gender
		const currentHeight = userProfile.height;
		const currentGender = userProfile.gender;

		let calculatedBMR: number;
		let source: 'current_data' | 'defaults' | 'stored_bmr';

		// If we have a stored BMR and it's valid, use it
		if (userProfile.bmr && userProfile.bmr > 0) {
			calculatedBMR = Math.round(userProfile.bmr);
			source = 'stored_bmr';
		}
		// If we have all required data for calculation, calculate BMR
		else if (currentWeight && currentHeight && currentAge && currentGender) {
			calculatedBMR = Math.round(
				calculateBMR(currentWeight, currentHeight, currentAge, currentGender)
			);
			source = 'current_data';
		}
		// If we have weight and height but missing age/gender, use defaults
		else if (currentWeight && currentHeight) {
			const defaultAge = 30;
			const defaultGender = 'male';
			calculatedBMR = Math.round(
				calculateBMR(currentWeight, currentHeight, defaultAge, defaultGender)
			);
			source = 'defaults';
		}
		// No valid data available
		else {
			calculatedBMR = 0;
			source = 'defaults';
		}

		const result: BMRCalculationResult = {
			bmr: calculatedBMR,
			weight: currentWeight || 0,
			height: currentHeight || 0,
			age: currentAge || 0,
			gender: currentGender || 'unknown',
			source,
		};

		// Cache the result
		bmrCache.set(cacheKey, result);

		return result;
	} catch (error) {
		console.error('Error calculating unified BMR:', error);

		// Return default values on error
		const defaultResult: BMRCalculationResult = {
			bmr: 0,
			weight: 0,
			height: 0,
			age: 0,
			gender: 'unknown',
			source: 'defaults',
		};

		return defaultResult;
	}
};

/**
 * Get BMR value only (for backward compatibility)
 */
export const getUnifiedBMR = async (clerkId: string): Promise<number> => {
	const result = await calculateUnifiedBMR(clerkId);
	return result.bmr;
};
