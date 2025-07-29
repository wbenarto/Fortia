import { fetchAPI } from './fetch';

export interface DataConsent {
	basic_profile: boolean;
	health_metrics: boolean;
	nutrition_data: boolean;
	weight_tracking: boolean;
	step_tracking: boolean;
	workout_activities: boolean;
	consent_version: string;
	updated_at: string;
}

/**
 * Fetch user's data consent status
 */
export async function fetchDataConsent(clerkId: string): Promise<DataConsent | null> {
	try {
		const response = await fetchAPI(`/(api)/data-consent?clerkId=${clerkId}`, {
			method: 'GET',
		});

		if (response.success) {
			return response.data;
		}
		return null;
	} catch (error) {
		console.error('Failed to fetch data consent:', error);
		return null;
	}
}

/**
 * Store user's data consent
 */
export async function storeDataConsent(
	clerkId: string,
	dataCollectionConsent: boolean,
	consentMethod: string = 'onboarding'
): Promise<boolean> {
	try {
		const response = await fetchAPI('/(api)/data-consent', {
			method: 'POST',
			body: JSON.stringify({
				clerkId,
				basicProfile: dataCollectionConsent,
				healthMetrics: dataCollectionConsent,
				nutritionData: dataCollectionConsent,
				weightTracking: dataCollectionConsent,
				stepTracking: dataCollectionConsent,
				workoutActivities: dataCollectionConsent,
				consentMethod,
			}),
		});

		return response.success;
	} catch (error) {
		console.error('Failed to store data consent:', error);
		return false;
	}
}

/**
 * Update data consent
 */
export async function updateDataConsent(
	clerkId: string,
	dataCollectionConsent: boolean
): Promise<boolean> {
	try {
		const response = await fetchAPI(`/(api)/data-consent?clerkId=${clerkId}`, {
			method: 'PUT',
			body: JSON.stringify({
				basicProfile: dataCollectionConsent,
				healthMetrics: dataCollectionConsent,
				nutritionData: dataCollectionConsent,
				weightTracking: dataCollectionConsent,
				stepTracking: dataCollectionConsent,
				workoutActivities: dataCollectionConsent,
			}),
		});

		return response.success;
	} catch (error) {
		console.error('Failed to update data consent:', error);
		return false;
	}
}

/**
 * Check if user has consented to data collection
 * Returns true if any of the consent fields are true
 */
export function hasDataCollectionConsent(consentData: DataConsent | null): boolean {
	if (!consentData) return false;
	return (
		consentData.basic_profile ||
		consentData.health_metrics ||
		consentData.nutrition_data ||
		consentData.weight_tracking ||
		consentData.step_tracking ||
		consentData.workout_activities
	);
}

/**
 * Get consent status for onboarding flow
 */
export function getOnboardingConsentStatus(consentData: DataConsent | null): {
	hasDataCollectionConsent: boolean;
} {
	return {
		hasDataCollectionConsent: hasDataCollectionConsent(consentData),
	};
}
