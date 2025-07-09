import { fetchAPI } from './fetch';

export interface DataConsent {
	data_collection_consent: boolean;
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
				dataCollectionConsent,
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
				dataCollectionConsent,
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
 */
export function hasDataCollectionConsent(consentData: DataConsent | null): boolean {
	return consentData?.data_collection_consent || false;
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
