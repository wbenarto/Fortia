import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAPI } from '@/lib/fetch';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { formatWeight, useUnitSystem } from '@/lib/units';
import { formatInsight, lastWeekRange, progressUrl, type ProgressData } from '@/lib/progress';

const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const recapKey = (weekStart: string) => `progress-recap-dismissed-${weekStart}`;

// Home: last week's recap (days on target, workouts, weight change, top insight),
// shown in a new week until dismissed, and only if something was logged last week.
const WeeklyRecapCard = () => {
	const { user } = useUser();
	const unitSystem = useUnitSystem();
	const [recap, setRecap] = useState<ProgressData | null>(null);

	const fetchData = useCallback(() => {
		if (!user?.id) return;
		const last = lastWeekRange();
		(async () => {
			try {
				const dismissed = await AsyncStorage.getItem(recapKey(last.from)).catch(() => '1');
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
				console.error('Load weekly recap error:', err);
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

	return null;
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

export default WeeklyRecapCard;
