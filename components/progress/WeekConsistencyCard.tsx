import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAPI } from '@/lib/fetch';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { formatWeight, useUnitSystem } from '@/lib/units';
import {
	TONE_STYLE,
	dayLetter,
	formatInsight,
	lastWeekRange,
	progressUrl,
	rangeFor,
	type ProgressData,
} from '@/lib/progress';
import { Dots } from '@/components/progress/ConsistencyCalendar';

const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const recapKey = (weekStart: string) => `progress-recap-dismissed-${weekStart}`;

// Home: the last 7 days at a glance (3 dots per day), streak and the top insight.
// In a new week, until dismissed, it shows last week's recap instead.
const WeekConsistencyCard = () => {
	const { user } = useUser();
	const unitSystem = useUnitSystem();
	const [week, setWeek] = useState<ProgressData | null>(null);
	const [recap, setRecap] = useState<ProgressData | null>(null);

	const fetchData = useCallback(() => {
		if (!user?.id) return;
		const { from, to } = rangeFor('week');
		const last = lastWeekRange();
		(async () => {
			try {
				const [weekRes, dismissed] = await Promise.all([
					fetchAPI(progressUrl(user.id, from, to), { method: 'GET' }),
					AsyncStorage.getItem(recapKey(last.from)).catch(() => '1'),
				]);
				if (weekRes.success) setWeek(weekRes.data);
				if (dismissed) {
					setRecap(null);
					return;
				}
				const lastRes = await fetchAPI(progressUrl(user.id, last.from, last.to), {
					method: 'GET',
				});
				const lastData: ProgressData | null = lastRes.success ? lastRes.data : null;
				// Only worth a recap if something was logged last week
				setRecap(lastData && lastData.summary.consistency.daysWithAnyLog > 0 ? lastData : null);
			} catch (err) {
				console.error('Load week progress error:', err);
			}
		})();
	}, [user?.id]);

	useRefetchOnFocus(fetchData, `${user?.id}`);

	const dismissRecap = () => {
		if (!recap) return;
		AsyncStorage.setItem(recapKey(recap.from), '1').catch(() => {});
		setRecap(null);
	};

	if (recap) {
		const { nutrition, activity, weight } = recap.summary;
		const top = recap.insights[0];
		return (
			<View className="mx-6 mt-2 bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4">
				<View className="flex-row items-center justify-between">
					<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={EYEBROW_STYLE}>
						Last week
					</Text>
					<TouchableOpacity onPress={dismissRecap} hitSlop={10} accessibilityLabel="Dismiss recap">
						<Ionicons name="close" size={18} color="#C9BEB4" />
					</TouchableOpacity>
				</View>
				<View className="flex-row mt-2">
					<RecapStat
						label="On target"
						value={`${nutrition.onTargetDays}/${nutrition.daysLogged}`}
						sub="days"
					/>
					<RecapStat
						label="Workouts"
						value={`${activity.workoutDays}/${activity.weeklyGoal}`}
						sub="days"
					/>
					<RecapStat
						label="Weight"
						value={
							weight.change != null
								? `${weight.change > 0 ? '+' : '−'}${formatWeight(Math.abs(weight.change), unitSystem)}`
								: '—'
						}
						sub={weight.change != null ? 'change' : `${weight.weighIns} weigh-ins`}
					/>
				</View>
				{top && (
					<Text className="text-xs font-JakartaMedium text-[#262135] mt-3">
						{formatInsight(top, unitSystem)}
					</Text>
				)}
				<TouchableOpacity
					onPress={() => {
						dismissRecap();
						router.push('/progress');
					}}
					className="mt-3 bg-[#E3BBA1] rounded-xl py-2.5"
				>
					<Text className="text-white text-center font-JakartaSemiBold text-[13px]">
						See progress
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!week) return null;
	const { consistency } = week.summary;
	const top = week.insights[0];
	const tone = top ? TONE_STYLE[top.tone] : null;

	return (
		<TouchableOpacity
			activeOpacity={0.85}
			onPress={() => router.push('/progress')}
			className="mx-6 mt-2 bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4"
			accessibilityLabel="Open progress"
		>
			<View className="flex-row items-center justify-between">
				<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={EYEBROW_STYLE}>
					This week
				</Text>
				<View className="flex-row items-center">
					{consistency.currentStreak > 0 && (
						<View className="flex-row items-center mr-2">
							<Ionicons name="flame" size={13} color="#E08585" />
							<Text className="text-[11px] font-JakartaBold text-[#262135] ml-0.5">
								{consistency.currentStreak}
							</Text>
						</View>
					)}
					<Ionicons name="chevron-forward" size={14} color="#C9BEB4" />
				</View>
			</View>

			<View className="flex-row justify-between mt-3">
				{week.days.map(day => (
					<View key={day.date} className="items-center" style={{ flex: 1 }}>
						<Text className="text-[10px] font-JakartaSemiBold text-[#94897E] mb-1.5">
							{dayLetter(day.date)}
						</Text>
						<Dots logged={day.logged} size={6} />
					</View>
				))}
			</View>

			{top && tone && (
				<View className="flex-row items-center mt-3">
					<Ionicons
						name={top.icon as keyof typeof Ionicons.glyphMap}
						size={14}
						color={tone.color}
					/>
					<Text
						className="flex-1 ml-1.5 text-xs font-JakartaMedium text-[#262135]"
						numberOfLines={2}
					>
						{formatInsight(top, unitSystem)}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
};

const RecapStat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
	<View style={{ flex: 1 }}>
		<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={EYEBROW_STYLE}>
			{label}
		</Text>
		<Text className="font-JakartaExtraBold text-[18px] text-[#262135] mt-0.5" numberOfLines={1}>
			{value}
		</Text>
		<Text className="font-JakartaMedium text-[11px] text-[#94897E]">{sub}</Text>
	</View>
);

export default WeekConsistencyCard;
