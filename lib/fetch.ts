import { useState, useEffect, useCallback } from 'react';

// Get the base URL from environment variables
const getBaseURL = () => {
	const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;

	if (!serverURL) {
		console.warn('EXPO_PUBLIC_SERVER_URL not set, using development fallback');
		return 'http://localhost:3000'; // Development fallback
	}

	return serverURL.replace(/\/$/, ''); // Remove trailing slash
};

export const fetchAPI = async (endpoint: string, options?: RequestInit) => {
	const baseURL = getBaseURL();
	const url = `${baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

	try {
		const response = await fetch(url, options);

		if (!response.ok) {
			const errorText = await response.text();

			// For 400/404 errors, return the error response instead of throwing
			// This allows calling code to handle these cases gracefully
			if (response.status === 400 || response.status === 404) {
				try {
					const errorData = JSON.parse(errorText);
					return { success: false, error: errorData.error || errorText };
				} catch {
					return { success: false, error: errorText };
				}
			}

			// For other errors, still throw
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		return data;
	} catch (error) {
		throw error;
	}
};

export const useFetch = <T>(endpoint: string, options?: RequestInit) => {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await fetchAPI(endpoint, options);
			setData(result.data);
		} catch (error) {
			setError((error as Error).message);
		} finally {
			setLoading(false);
		}
	}, [endpoint, options]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return { data, loading, error, refetch: fetchData };
};
