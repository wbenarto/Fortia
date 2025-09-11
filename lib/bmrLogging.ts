import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAPI } from './fetch';
import { getTodayDate } from './dateUtils';

interface BMRLoggingOptions {
	clerkId: string;
	bmr: number;
	onSuccess?: () => void;
	onError?: (error: any) => void;
}

/**
 * Logs BMR as a daily activity if not already logged today
 * This ensures BMR is only logged once per day per user
 * Uses database-first approach to prevent duplicates
 */
export const logDailyBMR = async ({
	clerkId,
	bmr,
	onSuccess,
	onError,
}: BMRLoggingOptions): Promise<boolean> => {
	try {
		const today = getTodayDate();

		// Check if BMR is valid
		if (!bmr || bmr <= 0) {
			return false;
		}

		// First check if BMR was already logged today in the database
		const alreadyLogged = await checkBMRLoggedToday(clerkId, today);
		if (alreadyLogged) {
			// Update AsyncStorage for consistency
			const lastBMRLogKey = `lastBMRLog_${clerkId}`;
			await AsyncStorage.setItem(lastBMRLogKey, today);
			onSuccess?.(); // Call success callback since BMR is already logged
			return true;
		}

		// Always try to update existing entry first (database-first approach)
		// This prevents duplicates even if AsyncStorage is unreliable
		const updateSuccess = await updateExistingBMREntry(clerkId, bmr, today, onSuccess, onError);

		if (updateSuccess) {
			// Update was successful, also update AsyncStorage for consistency
			const lastBMRLogKey = `lastBMRLog_${clerkId}`;
			await AsyncStorage.setItem(lastBMRLogKey, today);
			return true;
		}

		// If update failed (no existing entry), create new entry
		const response = await fetchAPI('/api/activities', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clerkId,
				activityDescription: 'Basal Metabolic Rate (BMR)',
				estimatedCalories: Math.round(bmr), // Round to nearest integer
				date: today, // Pass the frontend's date to ensure timezone consistency
			}),
		});

		if (response.success) {
			// Update last logged date in AsyncStorage
			const lastBMRLogKey = `lastBMRLog_${clerkId}`;
			await AsyncStorage.setItem(lastBMRLogKey, today);
			onSuccess?.();
			return true;
		} else {
			console.error('Failed to log BMR:', response.error);
			onError?.(response.error);
			return false;
		}
	} catch (error) {
		console.error('Error logging BMR:', error);
		onError?.(error);
		return false;
	}
};

/**
 * Updates existing BMR entry in the database, or creates one if none exists
 */
const updateExistingBMREntry = async (
	clerkId: string,
	bmr: number,
	today: string,
	onSuccess?: () => void,
	onError?: (error: any) => void
): Promise<boolean> => {
	try {
		const requestData = {
			clerkId,
			activityDescription: 'Basal Metabolic Rate (BMR)',
			estimatedCalories: Math.round(bmr),
			activityType: 'Basal Metabolic Rate', // Used to identify BMR entries
			date: today, // Pass the frontend's date to ensure timezone consistency
		};

		// First try to update existing BMR entry using PUT API
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
						activityDescription: 'Basal Metabolic Rate (BMR)',
						estimatedCalories: Math.round(bmr),
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
 * Checks if BMR was already logged today by querying the database directly
 * This is more reliable than AsyncStorage
 */
const checkBMRLoggedToday = async (clerkId: string, today: string): Promise<boolean> => {
	try {
		const response = await fetchAPI(`/api/activities?clerkId=${clerkId}&date=${today}`, {
			method: 'GET',
		});

		if (response.success && response.data) {
			// Check if any activity contains BMR
			const bmrExists = response.data.some(
				(activity: any) =>
					activity.activity_description &&
					activity.activity_description.toLowerCase().includes('basal metabolic rate')
			);

			return bmrExists;
		}

		return false;
	} catch (error) {
		console.error('Error checking BMR in database:', error);
		return false;
	}
};

/**
 * Checks if BMR was already logged today (AsyncStorage fallback)
 * @deprecated Use checkBMRLoggedToday for database-first approach
 */
export const isBMRLoggedToday = async (clerkId: string): Promise<boolean> => {
	try {
		const today = getTodayDate();
		const lastBMRLogKey = `lastBMRLog_${clerkId}`;
		const lastBMRLog = await AsyncStorage.getItem(lastBMRLogKey);
		return lastBMRLog === today;
	} catch (error) {
		console.error('Error checking BMR log status:', error);
		return false;
	}
};

/**
 * Gets the last BMR log date
 */
export const getLastBMRLogDate = async (clerkId: string): Promise<string | null> => {
	try {
		const lastBMRLogKey = `lastBMRLog_${clerkId}`;
		return await AsyncStorage.getItem(lastBMRLogKey);
	} catch (error) {
		console.error('Error getting last BMR log date:', error);
		return null;
	}
};

/**
 * Clears BMR log history (useful for testing or reset)
 */
export const clearBMRLogHistory = async (clerkId: string): Promise<void> => {
	try {
		const lastBMRLogKey = `lastBMRLog_${clerkId}`;
		await AsyncStorage.removeItem(lastBMRLogKey);
	} catch (error) {
		console.error('Error clearing BMR log history:', error);
	}
};
