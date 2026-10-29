import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { getTodayDate } from '@/lib/dateUtils';
import { fetchAPI } from '@/lib/fetch';
import { progressUrl, type ProgressData } from '@/lib/progress';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

// Home: today's date, the logging streak, and a button to the full Progress page.
// (The swipeable week strip with consistency dots — WeeklyCalendar's `logged` /
// `onWeekChange` props — is hidden for now.)

const dateLabel = (date: string) =>
	new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	});

const HomeCalendar = () => {
	const { user } = useUser();
	const today = getTodayDate();
	const [streak, setStreak] = useState(0);

	// The streak is computed server-side from full history; a one-day range is enough
	const loadStreak = useCallback(() => {
		if (!user?.id) return;
		const day = getTodayDate();
		fetchAPI(progressUrl(user.id, day, day), { method: 'GET' })
			.then(res => {
				if (res.success) setStreak((res.data as ProgressData).summary.consistency.currentStreak);
			})
			.catch(err => console.error('Load streak error:', err));
	}, [user?.id]);

	useRefetchOnFocus(loadStreak, `${user?.id}`);

	return (
		<View className="flex-row items-center justify-between px-6 mt-2">
			<Text className="font-JakartaBold text-[15px] text-[#262135]">{dateLabel(today)}</Text>
			<View className="flex-row items-center">
				{streak > 0 && (
					<View className="flex-row items-center mr-2.5">
						<Ionicons name="flame" size={14} color="#E08585" />
						<Text className="text-[12px] font-JakartaBold text-[#262135] ml-0.5">{streak}</Text>
						<Text className="text-[11px] font-JakartaMedium text-[#574F47] ml-1">day streak</Text>
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
	);
};

export default HomeCalendar;
