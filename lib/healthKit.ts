import { Platform } from 'react-native';
import * as Pedometer from 'expo-sensors/build/Pedometer';

export interface StepData {
	steps: number;
	date: string;
	goal: number;
	percentage: number;
	caloriesBurned?: number;
}

export interface CalorieCalculationParams {
	weight: number; // in kg
	height: number; // in cm
	age: number;
	gender: string;
	strideLength?: number; // in meters, optional
}

export interface HealthKitStatus {
	isAvailable: boolean;
	isAuthorized: boolean;
	permissions: string[];
}

/**
 * Check if HealthKit is available on the device (iOS only)
 */
export async function isHealthKitAvailable(): Promise<boolean> {
	try {
		// In Expo managed workflow, we use Pedometer which provides HealthKit-like functionality
		// on iOS devices. This automatically prompts for motion & fitness permissions.
		return Platform.OS === 'ios' && (await Pedometer.isAvailableAsync());
	} catch (error) {
		console.error('Error checking HealthKit availability:', error);
		return false;
	}
}

/**
 * Check if step counting is available on the device (fallback)
 */
export async function isStepCountingAvailable(): Promise<boolean> {
	try {
		return await Pedometer.isAvailableAsync();
	} catch (error) {
		console.error('Error checking pedometer availability:', error);
		return false;
	}
}

/**
 * Request HealthKit permissions with explicit user prompt
 * In Expo managed workflow, this uses Pedometer which automatically prompts for motion & fitness permissions
 */
export async function requestHealthKitPermissions(): Promise<HealthKitStatus> {
	try {
		const isAvailable = await isHealthKitAvailable();

		if (!isAvailable) {
			return {
				isAvailable: false,
				isAuthorized: false,
				permissions: [],
			};
		}

		// In Expo managed workflow, we use Pedometer which automatically prompts for motion & fitness permissions
		// when we try to access step data. The iOS system will show the permission dialog.
		// We'll test access by trying to get step count for today
		try {
			const today = new Date();
			const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			const endOfDay = new Date(startOfDay);
			endOfDay.setDate(endOfDay.getDate() + 1);

			// This will trigger the iOS permission prompt if not already granted
			const stepData = await Pedometer.getStepCountAsync(startOfDay, endOfDay);

			return {
				isAvailable: true,
				isAuthorized: true,
				permissions: ['motion', 'fitness', 'steps'],
			};
		} catch (permissionError) {
			// Permission was denied or error occurred
			return {
				isAvailable: true,
				isAuthorized: false,
				permissions: [],
			};
		}
	} catch (error) {
		console.error('Error requesting HealthKit permissions:', error);
		return {
			isAvailable: false,
			isAuthorized: false,
			permissions: [],
		};
	}
}

/**
 * Request step counting permissions (fallback)
 */
export async function requestStepPermissions(): Promise<HealthKitStatus> {
	try {
		const isAvailable = await Pedometer.isAvailableAsync();

		if (!isAvailable) {
			return {
				isAvailable: false,
				isAuthorized: false,
				permissions: [],
			};
		}

		// For pedometer, we assume permission is granted if available
		// iOS will prompt for motion & fitness permission automatically
		// Note: This should only be called after user has explicitly consented to step tracking
		return {
			isAvailable: true,
			isAuthorized: true,
			permissions: ['motion', 'fitness'],
		};
	} catch (error) {
		console.error('Error requesting step permissions:', error);
		return {
			isAvailable: false,
			isAuthorized: false,
			permissions: [],
		};
	}
}

/**
 * Get step count for today using HealthKit (via Pedometer in Expo)
 */
export async function getTodayStepCountFromHealthKit(): Promise<number> {
	try {
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const endOfDay = new Date(startOfDay);
		endOfDay.setDate(endOfDay.getDate() + 1);

		const stepData = await Pedometer.getStepCountAsync(startOfDay, endOfDay);
		return stepData?.steps || 0;
	} catch (error) {
		console.error('Error getting step count from HealthKit:', error);
		return 0;
	}
}

/**
 * Get step count for today using pedometer (fallback)
 */
export async function getTodayStepCount(): Promise<number> {
	try {
		const isAvailable = await Pedometer.isAvailableAsync();

		if (!isAvailable) {
			return 0;
		}

		// Get today's step count
		const today = new Date();
		const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const endOfDay = new Date(startOfDay);
		endOfDay.setDate(endOfDay.getDate() + 1);

		const stepData = await Pedometer.getStepCountAsync(startOfDay, endOfDay);
		return stepData?.steps || 0;
	} catch (error) {
		console.error('Error getting step count:', error);
		return 0;
	}
}

/**
 * Get step count for a specific date
 */
export async function getStepCount(date: Date): Promise<number> {
	try {
		const isAvailable = await Pedometer.isAvailableAsync();

		if (!isAvailable) {
			return 0;
		}

		const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const endOfDay = new Date(startOfDay);
		endOfDay.setDate(endOfDay.getDate() + 1);

		const stepData = await Pedometer.getStepCountAsync(startOfDay, endOfDay);
		return stepData?.steps || 0;
	} catch (error) {
		console.error('Error getting step count:', error);
		return 0;
	}
}

/**
 * Calculate calories burned from steps using personalized parameters
 */
export function calculateCaloriesFromSteps(
	steps: number,
	params: CalorieCalculationParams
): number {
	const { weight, height, gender, strideLength } = params;

	// Calculate stride length if not provided
	let calculatedStrideLength = strideLength;
	if (!calculatedStrideLength) {
		// Average stride length based on height and gender
		if (gender === 'male') {
			calculatedStrideLength = (height * 0.415) / 100; // Convert cm to meters
		} else {
			calculatedStrideLength = (height * 0.413) / 100; // Convert cm to meters
		}
	}

	// Calculate distance walked in meters
	const distanceMeters = steps * calculatedStrideLength;

	// Convert to kilometers
	const distanceKm = distanceMeters / 1000;

	// Calories burned per km varies by weight and walking speed
	// Average walking speed is ~5 km/h, moderate pace
	// Calories per km = weight (kg) × 0.6 (for moderate walking)
	const caloriesPerKm = weight * 0.6;

	// Total calories burned
	const totalCalories = distanceKm * caloriesPerKm;

	return Math.round(totalCalories);
}

/**
 * Simple calorie calculation (fallback method)
 */
export function calculateSimpleCaloriesFromSteps(steps: number, weight: number): number {
	// Simple formula: ~0.04 calories per step, adjusted for weight
	const baseCaloriesPerStep = 0.04;
	const weightMultiplier = weight / 70; // Normalize to 70kg baseline
	return Math.round(steps * baseCaloriesPerStep * weightMultiplier);
}

/**
 * Get step data with goal, percentage, and calories burned
 */
export async function getStepData(
	date: Date = new Date(),
	goal: number = 10000,
	calorieParams?: CalorieCalculationParams
): Promise<StepData> {
	const steps = await getStepCount(date);
	const percentage = goal > 0 ? Math.round((steps / goal) * 100) : 0;

	let caloriesBurned = 0;
	if (calorieParams && steps > 0) {
		caloriesBurned = calculateCaloriesFromSteps(steps, calorieParams);
	}

	return {
		steps,
		date: date.toISOString().split('T')[0],
		goal,
		percentage: Math.min(percentage, 100),
		caloriesBurned,
	};
}

/**
 * Get step data for today with HealthKit fallback to Pedometer
 */
export async function getTodayStepData(
	goal: number = 10000,
	calorieParams?: CalorieCalculationParams,
	date: Date = new Date()
): Promise<StepData> {
	try {
		// First try HealthKit
		const healthKitAvailable = await isHealthKitAvailable();
		let steps = 0;

		if (healthKitAvailable) {
			steps = await getTodayStepCountFromHealthKit();
		} else {
			// Fallback to Pedometer
			steps = await getTodayStepCount();
		}

		const percentage = goal > 0 ? Math.round((steps / goal) * 100) : 0;

		let caloriesBurned = 0;
		if (calorieParams && steps > 0) {
			caloriesBurned = calculateCaloriesFromSteps(steps, calorieParams);
		}

		return {
			steps,
			date: date.toISOString().split('T')[0],
			goal,
			percentage: Math.min(percentage, 100),
			caloriesBurned,
		};
	} catch (error) {
		console.error('Error getting step data:', error);
		return {
			steps: 0,
			date: date.toISOString().split('T')[0],
			goal,
			percentage: 0,
			caloriesBurned: 0,
		};
	}
}

/**
 * Check current HealthKit authorization status
 * In Expo managed workflow, we check if Pedometer is available without accessing data
 */
export async function getHealthKitStatus(): Promise<HealthKitStatus> {
	try {
		const isAvailable = await isHealthKitAvailable();

		if (!isAvailable) {
			return {
				isAvailable: false,
				isAuthorized: false,
				permissions: [],
			};
		}

		// In Expo managed workflow with Pedometer, we can't check permissions without accessing data
		// So we return a conservative status that requires explicit permission request
		// The actual permission check will happen when user explicitly requests access
		return {
			isAvailable: true,
			isAuthorized: false, // Conservative approach - assume not authorized until explicitly granted
			permissions: [],
		};
	} catch (error) {
		console.error('Error getting HealthKit status:', error);
		return {
			isAvailable: false,
			isAuthorized: false,
			permissions: [],
		};
	}
}

/**
 * Verify HealthKit permissions by testing actual data access
 * This should only be called after user has explicitly granted permissions
 */
export async function verifyHealthKitPermissions(): Promise<HealthKitStatus> {
	try {
		const isAvailable = await isHealthKitAvailable();

		if (!isAvailable) {
			return {
				isAvailable: false,
				isAuthorized: false,
				permissions: [],
			};
		}

		// Test if we can actually get step data (this indicates permissions are granted)
		try {
			const today = new Date();
			const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			const endOfDay = new Date(startOfDay);
			endOfDay.setDate(endOfDay.getDate() + 1);

			// Try to get step count - if this works, permissions are granted
			await Pedometer.getStepCountAsync(startOfDay, endOfDay);

			return {
				isAvailable: true,
				isAuthorized: true,
				permissions: ['motion', 'fitness', 'steps'],
			};
		} catch (permissionError) {
			// Permission not granted or error occurred
			return {
				isAvailable: true,
				isAuthorized: false,
				permissions: [],
			};
		}
	} catch (error) {
		console.error('Error verifying HealthKit permissions:', error);
		return {
			isAvailable: false,
			isAuthorized: false,
			permissions: [],
		};
	}
}
