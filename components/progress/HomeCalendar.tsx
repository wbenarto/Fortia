import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import WeeklyCalendar from '@/components/WeeklyCalendar';
import { getTodayDate } from '@/lib/dateUtils';
import { fetchAPI } from '@/lib/fetch';
import { addDays, progressUrl, type ProgressData, type ProgressDay } from '@/lib/progress';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

// Home: swipeable week strip with each day's consistency dots (meal / weight / workout),
// the logging streak, and a button to the full Progress page.

const RECENT_DAYS = 112; // 16 weeks per request (the API allows up to 120)

const monthLabel = (from: string, to: string) => {
	const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
		new Date(`${d}T12:00:00`).toLocaleDateString('en-US', opts);
	const sameMonth = from.slice(0, 7) === to.slice(0, 7);
	if (sameMonth) return fmt(to, { month: 'long', year: 'numeric' });
	const sameYear = from.slice(0, 4) === to.slice(0, 4);
	return sameYear
		? `${fmt(from, { month: 'short' })} – ${fmt(to, { month: 'short', year: 'numeric' })}`
		: `${fmt(from, { month: 'short', year: 'numeric' })} – ${fmt(to, { month: 'short', year: 'numeric' })}`;
};

const HomeCalendar = () => {
	const { user } = useUser();
	const today = getTodayDate();
	const [logged, setLogged] = useState<Record<string, ProgressDay['logged']>>({});
	const [streak, setStreak] = useState(0);
	const [week, setWeek] = useState(() => {
		const sunday = addDays(today, -new Date(`${today}T12:00:00`).getDay());
		return { from: sunday, to: addDays(sunday, 6) };
	});
	const loadedFrom = useRef<string | null>(null);

	const load = useCallback(
		async (from: string, to: string) => {
			if (!user?.id) return null;
			const res = await fetchAPI(progressUrl(user.id, from, to), { method: 'GET' });
			if (!res.success) return null;
			const data: ProgressData = res.data;
			setLogged(prev => ({
				...prev,
				...Object.fromEntries(data.days.map(d => [d.date, d.logged])),
			}));
			return data;
		},
		[user?.id]
	);

	const loadRecent = useCallback(() => {
		const to = getTodayDate();
		const from = addDays(to, -(RECENT_DAYS - 1));
		load(from, to)
			.then(data => {
				if (!data) return;
				setStreak(data.summary.consistency.currentStreak);
				if (!loadedFrom.current || from < loadedFrom.current) loadedFrom.current = from;
			})
			.catch(err => console.error('Load calendar progress error:', err));
	}, [load]);

	useRefetchOnFocus(loadRecent, `${user?.id}`);

	// Swiping back past what's loaded fetches the next 16 weeks
	const onWeekChange = (from: string, to: string) => {
		setWeek({ from, to });
		const loaded = loadedFrom.current;
		if (!loaded || from >= loaded) return;
		const end = addDays(loaded, -1);
		const start = addDays(end, -(RECENT_DAYS - 1));
		loadedFrom.current = start;
		load(start, end).catch(err => console.error('Load calendar progress error:', err));
	};

	return (
		<View className="mt-2">
			<View className="flex-row items-center justify-between px-6 mb-1">
				<Text className="font-JakartaBold text-[15px] text-[#262135]">
					{monthLabel(week.from, week.to)}
				</Text>
				<View className="flex-row items-center">
					{streak > 0 && (
						<View className="flex-row items-center mr-2.5">
							<Ionicons name="flame" size={14} color="#E08585" />
							<Text className="text-[12px] font-JakartaBold text-[#262135] ml-0.5">{streak}</Text>
							<Text className="text-[11px] font-JakartaMedium text-[#94897E] ml-1">day streak</Text>
						</View>
					)}
					<TouchableOpacity
						onPress={() => router.push('/progress')}
						hitSlop={8}
						className="w-7 h-7 rounded-full bg-white border-[1px] border-[#F0EBE6] items-center justify-center"
						accessibilityLabel="Open progress"
					>
						<Ionicons name="chevron-forward" size={15} color="#262135" />
					</TouchableOpacity>
				</View>
			</View>
			<WeeklyCalendar logged={logged} onWeekChange={onWeekChange} />
		</View>
	);
};

export default HomeCalendar;
