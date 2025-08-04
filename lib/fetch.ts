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
	try {
		const baseURL = getBaseURL();
		const url = `${baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

		console.log(`🌐 API Call: ${url}`); // Development logging
		console.log(`🌐 Base URL: ${baseURL}`);
		console.log(`🌐 Endpoint: ${endpoint}`);
		console.log(`🌐 Full URL: ${url}`);
		console.log(`🌐 Request options:`, options);

		const response = await fetch(url, options);

		console.log(`📡 Response status: ${response.status}`);
		console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

		if (!response.ok) {
			console.error(`❌ HTTP error! status: ${response.status}`);
			const errorText = await response.text();
			console.error(`❌ Error response body:`, errorText);
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log(`✅ Response data:`, data);
		return data;
	} catch (error) {
		console.error('❌ Fetch error:', error);
		console.error('❌ Error type:', typeof error);
		console.error('❌ Error constructor:', error?.constructor?.name);
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
