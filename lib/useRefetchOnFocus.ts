import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useDataVersionStore } from '@/store';
import { getTodayDate } from '@/lib/dateUtils';

// Like useFocusEffect, but only runs `refetch` when something it depends on could have
// changed since the last run: any write through fetchAPI (data version), the day rolling
// over, or `key` changing (e.g. user id or viewed date). Swiping back to a tab with
// nothing new then shows the data already on screen instead of reloading it.
// The version is subscribed to, so a write made while this screen is focused (e.g. from
// the global food lookup sheet) refreshes it in place too.
export const useRefetchOnFocus = (refetch: () => void | (() => void), key: string) => {
	const lastRun = useRef<string | null>(null);
	const version = useDataVersionStore(s => s.version);

	useFocusEffect(
		useCallback(() => {
			const stamp = `${version}|${getTodayDate()}|${key}`;
			if (lastRun.current === stamp) return;
			lastRun.current = stamp;
			return refetch();
		}, [refetch, key, version])
	);
};
