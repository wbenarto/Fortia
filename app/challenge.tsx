import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengeCalendar, GridLegend } from '@/components/challenges/ChallengeGrid';
import {
	LEVEL_COLORS,
	STATE_LABEL,
	type ChallengeDay,
	type ChallengeDetail,
} from '@/lib/challenges';
import { getTodayDate } from '@/lib/dateUtils';
import { DIET_INFO, resolveDietType } from '@/lib/diet';
import { fetchAPI } from '@/lib/fetch';
import { shortDate } from '@/lib/progress';
import { SCREEN_BG } from '@/lib/theme';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

// A macro challenge: GitHub-style grid of days, today's / any day's numbers,
// weekly workout goal and streak. GET /api/challenges/:id.

const INK = '#262135';
const CARD = 'bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4';
const EYEBROW = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
	<View style={{ flex: 1 }}>
		<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
			{label}
		</Text>
		<Text className="font-JakartaExtraBold text-[20px] text-[#262135] mt-0.5">{value}</Text>
		{sub ? <Text className="font-JakartaMedium text-[11px] text-[#574F47]">{sub}</Text> : null}
	</View>
);

const TargetRow = ({
	label,
	value,
	target,
	hit,
	under,
}: {
	label: string;
	value: number;
	target: number;
	hit: boolean;
	under: boolean; // "at or under" target vs "reach" target
}) => (
	<View className="flex-row items-center py-1.5">
		<Ionicons
			name={hit ? 'checkmark-circle' : 'close-circle'}
			size={18}
			color={hit ? '#30A14E' : '#E5484D'}
		/>
		<Text className="flex-1 ml-2 font-JakartaSemiBold text-[14px] text-[#262135]">{label}</Text>
		<Text className="font-JakartaBold text-[14px] text-[#262135]">
			{value}
			<Text className="font-JakartaMedium text-[12px] text-[#574F47]">
				{` / ${target}${label === 'Calories' ? ' cal' : 'g'} ${under ? 'max' : 'goal'}`}
			</Text>
		</Text>
	</View>
);

const DayDetail = ({ day, detail }: { day: ChallengeDay; detail: ChallengeDetail }) => {
	const t = detail.challenge.targets;
	return (
		<View className="mt-4 rounded-2xl bg-[#F9F6F2] px-4 py-3">
			<View className="flex-row items-center justify-between">
				<Text className="font-JakartaBold text-[15px] text-[#262135]">{shortDate(day.date)}</Text>
				<Text className="font-JakartaSemiBold text-[12px] text-[#574F47]">
					{STATE_LABEL[day.state]}
				</Text>
			</View>
			{day.logged ? (
				<View className="mt-1.5">
					<TargetRow
						label="Calories"
						value={day.calories}
						target={t.calories}
						hit={day.hits.calories}
						under
					/>
					<TargetRow label="Carbs" value={day.carbs} target={t.carbs} hit={day.hits.carbs} under />
					<TargetRow label="Fat" value={day.fats} target={t.fats} hit={day.hits.fats} under />
					<TargetRow
						label="Protein"
						value={day.protein}
						target={t.protein}
						hit={day.hits.protein}
						under={false}
					/>
				</View>
			) : (
				<Text className="font-JakartaMedium text-[13px] text-[#3D3630] mt-1.5">
					No meals logged{day.state === 'today' ? ' yet today.' : ' this day.'}
				</Text>
			)}
			{day.workout && (
				<Text className="font-JakartaSemiBold text-[12px] text-[#30A14E] mt-1">Workout logged</Text>
			)}
		</View>
	);
};

const ChallengeScreen = () => {
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const { id } = useLocalSearchParams<{ id?: string }>();
	const [detail, setDetail] = useState<ChallengeDetail | null>(null);
	const [error, setError] = useState('');
	const [selected, setSelected] = useState<string | null>(null);

	const load = useCallback(() => {
		if (!user?.id) return;
		const today = getTodayDate();
		const url = id
			? `/api/challenges/${id}?clerkId=${user.id}&today=${today}`
			: `/api/challenges?clerkId=${user.id}&today=${today}`;
		fetchAPI(url, { method: 'GET' })
			.then(res => {
				if (!res.success) return setError(res.error || 'Could not load the challenge.');
				const data: ChallengeDetail | null = id ? res.data : res.data.active;
				if (!data) return setError('No active challenge.');
				setDetail(data);
				setSelected(prev => prev ?? (data.days.find(d => d.state === 'today')?.date || null));
			})
			.catch(() => setError('Could not load the challenge.'));
	}, [user?.id, id]);

	useRefetchOnFocus(load, `${user?.id}|${id}`);

	const endChallenge = () => {
		if (!detail || !user?.id) return;
		Alert.alert('End this challenge?', 'Your progress so far is kept in your history.', [
			{ text: 'Keep going', style: 'cancel' },
			{
				text: 'End challenge',
				style: 'destructive',
				onPress: async () => {
					const res = await fetchAPI(`/api/challenges/${detail.challenge.id}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ clerkId: user.id, action: 'end' }),
					});
					if (res.success) router.back();
					else Alert.alert('Could not end the challenge', res.error || 'Please try again.');
				},
			},
		]);
	};

	const s = detail?.stats;
	const c = detail?.challenge;
	const picked = detail?.days.find(d => d.date === selected);
	const isActive = c?.status === 'active';
	const notStarted = !!s && s.dayNumber === 0;

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">Challenge</Text>
					<View style={{ width: 26 }} />
				</View>

				{!detail || !s || !c ? (
					<View className="flex-1 items-center justify-center">
						{error ? (
							<Text className="font-JakartaMedium text-[#574F47]">{error}</Text>
						) : (
							<ActivityIndicator color="#D4A07E" />
						)}
					</View>
				) : (
					<ScrollView
						contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 + insets.bottom }}
						showsVerticalScrollIndicator={false}
					>
						{/* Hero */}
						<View className={CARD}>
							<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
								{DIET_INFO[resolveDietType(c.diet_type)].label} · {c.workouts_per_week} workouts a
								week
							</Text>
							<Text className="font-JakartaExtraBold text-[26px] text-[#262135] mt-1">
								{notStarted
									? `Starts ${shortDate(c.start_date)}`
									: isActive
										? `Day ${s.dayNumber} of ${s.totalDays}`
										: c.status === 'completed'
											? 'Challenge complete'
											: 'Challenge ended'}
							</Text>
							<Text className="font-JakartaMedium text-[13px] text-[#3D3630] mt-0.5">
								{shortDate(c.start_date)} – {shortDate(c.end_date)} · {s.totalDays} days
							</Text>
							<View className="h-2.5 rounded-full bg-[#F0EBE6] mt-3 overflow-hidden">
								<View
									className="h-full rounded-full"
									style={{
										width: `${(s.completedDays / s.totalDays) * 100}%`,
										backgroundColor: LEVEL_COLORS[3],
									}}
								/>
							</View>
							<View className="flex-row mt-4">
								<Stat
									label="Completed"
									value={`${s.completedDays}/${s.totalDays}`}
									sub={s.completionPct != null ? `${s.completionPct}% so far` : 'days'}
								/>
								<Stat label="Streak" value={`${s.streak}`} sub={s.streak === 1 ? 'day' : 'days'} />
								<Stat
									label="Missed"
									value={`${s.missedDays}`}
									sub={s.missedDays === 1 ? 'day' : 'days'}
								/>
							</View>
						</View>

						{/* Grid */}
						<View className={`${CARD} mt-4`}>
							<ChallengeCalendar
								days={detail.days}
								maxHeight={Infinity}
								selected={selected}
								onSelect={d => setSelected(d.date)}
							/>
							<View className="mt-3">
								<GridLegend />
							</View>
							{picked && picked.state !== 'future' && <DayDetail day={picked} detail={detail} />}
						</View>

						{/* Workouts */}
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-6 mb-2 ml-1"
							style={EYEBROW}
						>
							Workouts · goal {c.workouts_per_week} a week
						</Text>
						<View className={CARD}>
							<View className="flex-row flex-wrap" style={{ gap: 8 }}>
								{detail.weeks.map(w => (
									<View
										key={w.index}
										className="items-center rounded-2xl px-2.5 py-2"
										style={{
											minWidth: 62,
											backgroundColor: w.met
												? '#40C46322'
												: w.state === 'future'
													? 'transparent'
													: '#F9F6F2',
											borderWidth: w.state === 'current' ? 1.5 : 1,
											borderColor: w.state === 'current' ? INK : '#F0EBE6',
										}}
									>
										<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]">
											Week {w.index + 1}
										</Text>
										<Text className="font-JakartaBold text-[14px] text-[#262135] mt-0.5">
											{w.state === 'future' ? '–' : `${w.workouts}/${w.goal}`}
										</Text>
										{w.met && <Ionicons name="checkmark-circle" size={14} color="#30A14E" />}
									</View>
								))}
							</View>
							<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-3">
								{s.weeksMet} of {s.weeksDone} finished weeks hit the goal
							</Text>
						</View>

						{/* Targets */}
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-6 mb-2 ml-1"
							style={EYEBROW}
						>
							Daily targets
						</Text>
						<View className={`${CARD} flex-row`}>
							<Stat label="Calories" value={`${c.targets.calories}`} sub="max" />
							<Stat label="Carbs" value={`${c.targets.carbs}g`} sub="max" />
							<Stat label="Fat" value={`${c.targets.fats}g`} sub="max" />
							<Stat label="Protein" value={`${c.targets.protein}g`} sub="goal" />
						</View>

						{isActive && (
							<TouchableOpacity onPress={endChallenge} className="mt-8 self-center px-4 py-2">
								<Text className="font-JakartaSemiBold text-[14px] text-[#E08585]">
									End challenge
								</Text>
							</TouchableOpacity>
						)}
					</ScrollView>
				)}
			</View>
		</>
	);
};

export default ChallengeScreen;
