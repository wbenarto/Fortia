import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAPI } from './fetch';
import { getTodayDate } from './dateUtils';

interface StepsLoggingOptions {
	clerkId: string;
	steps: number;
	caloriesBurned?: number;
	onSuccess?: () => void;
	onError?: (error: any) => void;
}

/**
 * Logs daily steps as an activity if not already logged today
 * This ensures steps are only logged once per day per user
 * Uses database-first approach to prevent duplicates
 */
export const logDailySteps = async ({
	clerkId,
	steps,
	caloriesBurned,
	onSuccess,
	onError,
}: StepsLoggingOptions): Promise<boolean> => {
	try {
		const today = getTodayDate();

		// Check if steps is valid
		if (!steps || steps <= 0) {
			return false;
		}

		// Calculate calories burned from steps if not provided
		// Rough estimate: 0.04 calories per step
		const estimatedCalories = caloriesBurned || Math.round(steps * 0.04);

		// Always try to update existing entry first (database-first approach)
		// This prevents duplicates even if AsyncStorage is unreliable
		const updateSuccess = await updateExistingStepsEntry(
			clerkId,
			steps,
			estimatedCalories,
			today,
			onSuccess,
			onError
		);

		if (updateSuccess) {
			// Update was successful, also update AsyncStorage for consistency
			const lastStepsLogKey = `lastStepsLog_${clerkId}`;
			await AsyncStorage.setItem(lastStepsLogKey, today);
			return true;
		}

		// If update failed (no existing entry), create new entry
		const response = await fetchAPI('/api/activities', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clerkId,
				activityDescription: `Daily Steps: ${steps.toLocaleString()}`,
				estimatedCalories: estimatedCalories,
				date: today, // Pass the frontend's date to ensure timezone consistency
			}),
		});

		if (response.success) {
			// Update last logged date in AsyncStorage
			const lastStepsLogKey = `lastStepsLog_${clerkId}`;
			await AsyncStorage.setItem(lastStepsLogKey, today);
			onSuccess?.();
			return true;
		} else {
			console.error('Failed to log steps:', response.error);
			onError?.(response.error);
			return false;
		}
	} catch (error) {
		console.error('Error logging steps:', error);
		onError?.(error);
		return false;
	}
};

/**
 * Checks if steps were already logged today
 */
export const isStepsLoggedToday = async (clerkId: string): Promise<boolean> => {
	try {
		const today = getTodayDate();
		const lastStepsLogKey = `lastStepsLog_${clerkId}`;
		const lastStepsLog = await AsyncStorage.getItem(lastStepsLogKey);
		return lastStepsLog === today;
	} catch (error) {
		console.error('Error checking steps log status:', error);
		return false;
	}
};

/**
 * Gets the last steps log date
 */
export const getLastStepsLogDate = async (clerkId: string): Promise<string | null> => {
	try {
		const lastStepsLogKey = `lastStepsLog_${clerkId}`;
		return await AsyncStorage.getItem(lastStepsLogKey);
	} catch (error) {
		console.error('Error getting last steps log date:', error);
		return null;
	}
};

/**
 * Clears steps log history (useful for testing or reset)
 */
export const clearStepsLogHistory = async (clerkId: string): Promise<void> => {
	try {
		const lastStepsLogKey = `lastStepsLog_${clerkId}`;
		await AsyncStorage.removeItem(lastStepsLogKey);
	} catch (error) {
		console.error('Error clearing steps log history:', error);
	}
};

/**
 * Updates existing steps entry in the database, or creates one if none exists
 */
const updateExistingStepsEntry = async (
	clerkId: string,
	steps: number,
	estimatedCalories: number,
	today: string,
	onSuccess?: () => void,
	onError?: (error: any) => void
): Promise<boolean> => {
	try {
		const requestData = {
			clerkId,
			activityDescription: `Daily Steps: ${steps.toLocaleString()}`,
			estimatedCalories: estimatedCalories,
			activityType: 'Daily Steps', // Used to identify steps entries
			date: today, // Pass the frontend's date to ensure timezone consistency
		};

		// First try to update existing steps entry using PUT API
		const updateResponse = await fetchAPI('/api/activities', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestData),
		});

		if (updateResponse.success) {
			onSuccess?.();
			return true;
		} else {
			// Check if it's a 404 error (no existing entry)
			if (
				updateResponse.error?.includes('404') ||
				updateResponse.error?.includes('No matching activity found')
			) {
				const createResponse = await fetchAPI('/api/activities', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						clerkId,
						activityDescription: `Daily Steps: ${steps.toLocaleString()}`,
						estimatedCalories: estimatedCalories,
						date: today, // Pass the frontend's date to ensure timezone consistency
					}),
				});

				if (createResponse.success) {
					onSuccess?.();
					return true;
				} else {
					onError?.(createResponse.error);
					return false;
				}
			} else {
				// Other error types (including 400)
				onError?.(updateResponse.error);
				return false;
			}
		}
	} catch (error) {
		onError?.(error);
		return false;
	}
};

/**
 * Updates steps if already logged today (for when step count changes)
 */
export const updateDailySteps = async ({
	clerkId,
	steps,
	caloriesBurned,
	onSuccess,
	onError,
}: StepsLoggingOptions): Promise<boolean> => {
	try {
		const today = getTodayDate();
		const lastStepsLogKey = `lastStepsLog_${clerkId}`;
		const lastStepsLog = await AsyncStorage.getItem(lastStepsLogKey);

		// If not logged today, log as new entry
		if (lastStepsLog !== today) {
			return await logDailySteps({
				clerkId,
				steps,
				caloriesBurned,
				onSuccess,
				onError,
			});
		}

		// If already logged today, we could update the existing entry
		// For now, we'll skip updating to avoid complexity
		// In the future, you could implement an update mechanism
		return false;
	} catch (error) {
		console.error('Error updating steps:', error);
		onError?.(error);
		return false;
	}
};
