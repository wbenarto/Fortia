import { calculateBMR } from './bmrUtils';

interface BMRCalculationOptions {
	weight?: number;
	height?: number;
	age?: number;
	gender?: string;
	storedBMR?: number;
}

// Cache for BMR calculations
const bmrCache = new Map<string, number>();

/**
 * Generate cache key from user data
 */
const getBMRCacheKey = (options: BMRCalculationOptions): string => {
	const { weight, height, age, gender, storedBMR } = options;
	return `${weight || 0}_${height || 0}_${age || 0}_${gender || 'unknown'}_${storedBMR || 0}`;
};

/**
 * Clear BMR cache (useful for testing or when user data changes significantly)
 */
export const clearBMRCache = (): void => {
	bmrCache.clear();
};

/**
 * Clear BMR cache for specific user data (when profile changes)
 */
export const clearBMRCacheForUser = (options: BMRCalculationOptions): void => {
	const cacheKey = getBMRCacheKey(options);
	bmrCache.delete(cacheKey);
};

/**
 * Centralized BMR calculation function with caching
 * Uses stored BMR if available, otherwise calculates from user data
 * Provides consistent BMR values across the app with performance optimization
 */
export const getConsistentBMR = ({
	weight,
	height,
	age,
	gender,
	storedBMR,
}: BMRCalculationOptions): number => {
	// Generate cache key
	const cacheKey = getBMRCacheKey({ weight, height, age, gender, storedBMR });

	// Check cache first
	if (bmrCache.has(cacheKey)) {
		return bmrCache.get(cacheKey)!;
	}

	let calculatedBMR: number;

	// If we have a stored BMR and it's valid, use it
	if (storedBMR && storedBMR > 0) {
		calculatedBMR = Math.round(storedBMR);
	}
	// If we have all required data for calculation, calculate BMR
	else if (weight && height && age && gender) {
		calculatedBMR = Math.round(calculateBMR(weight, height, age, gender));
	}
	// If we have weight and height but missing age/gender, use defaults
	else if (weight && height) {
		const defaultAge = 30;
		const defaultGender = 'male';
		calculatedBMR = Math.round(calculateBMR(weight, height, defaultAge, defaultGender));
	}
	// No valid data available
	else {
		calculatedBMR = 0;
	}

	// Cache the result
	bmrCache.set(cacheKey, calculatedBMR);

	return calculatedBMR;
};

/**
 * Get BMR for logging to database
 * This ensures the same BMR calculation is used everywhere
 */
export const getBMRForLogging = (userProfile: any): number => {
	return getConsistentBMR({
		weight: userProfile?.weight,
		height: userProfile?.height,
		age: userProfile?.age || 30, // Default age
		gender: userProfile?.gender || 'male', // Default gender
		storedBMR: userProfile?.bmr,
	});
};

/**
 * Get BMR for display in ActivityTracking
 * Uses the same calculation logic as logging
 */
export const getBMRForDisplay = (nutritionGoals: any): number => {
	return getConsistentBMR({
		weight: nutritionGoals?.weight,
		height: nutritionGoals?.height,
		age: nutritionGoals?.age,
		gender: nutritionGoals?.gender,
		storedBMR: nutritionGoals?.bmr,
	});
};
