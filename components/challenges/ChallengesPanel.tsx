import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { ChallengeCalendar } from '@/components/challenges/ChallengeGrid';
import { type ChallengesData } from '@/lib/challenges';
import { getTodayDate } from '@/lib/dateUtils';
import { DIET_INFO, resolveDietType } from '@/lib/diet';
import { fetchAPI } from '@/lib/fetch';
import { shortDate } from '@/lib/progress';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

// The active challenge (mini grid) or a start card.
// - 'home' (Home, below Nutrition): just that card.
// - 'tab' (Challenges tab): the card plus past challenges.

const EYEBROW = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const CHALLENGE_GREEN = '#30A14E'; // same green as the start card's trophy
const BUTTON_TEXT_SHADOW = {
	textShadowColor: 'rgba(110,60,30,0.35)',
	textShadowOffset: { width: 0, height: 1 },
	textShadowRadius: 2,
};

const ChallengesPanel = ({ variant = 'tab' }: { variant?: 'home' | 'tab' }) => {
	const isHome = variant === 'home';
	const { user } = useUser();
	const [data, setData] = useState<ChallengesData | null>(null);
	const [error, setError] = useState('');

	const load = useCallback(() => {
		if (!user?.id) return;
		fetchAPI(`/api/challenges?clerkId=${user.id}&today=${getTodayDate()}`, { method: 'GET' })
			.then(res =>
				res.success ? setData(res.data) : setError(res.error || 'Could not load challenges.')
			)
			.catch(() => setError('Could not load challenges.'));
	}, [user?.id]);

	useRefetchOnFocus(load, `${user?.id}`);

	if (!data) {
		if (isHome) return null; // don't hold up Home with a spinner
		return (
			<View className="py-10 items-center">
				{error ? (
					<Text className="font-JakartaMedium text-[#574F47]">{error}</Text>
				) : (
					<ActivityIndicator color="#D4A07E" />
				)}
			</View>
		);
	}

	const active = data.active;
	const currentWeek = active?.weeks.find(w => w.state === 'current');

	return (
		<View className={isHome ? 'px-6 mt-12' : 'pb-32'}>
			{active ? (
				<TouchableOpacity
					activeOpacity={0.9}
					onPress={() =>
						router.push({ pathname: '/challenge', params: { id: String(active.challenge.id) } })
					}
					accessibilityLabel="Open your challenge"
				>
					{/* Plain white card, like the other Home cards */}
					<View
						className="rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden"
						style={{ backgroundColor: '#FFFFFF' }}
					>
						<View style={{ padding: 16 }}>
							<View className="flex-row items-center justify-between">
								<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
									Active challenge
								</Text>
								<Ionicons name="chevron-forward" size={18} color="#857869" />
							</View>
							<Text className="font-JakartaExtraBold text-[24px] text-[#262135] mt-1">
								{active.stats.dayNumber === 0
									? `Starts ${shortDate(active.challenge.start_date)}`
									: `Day ${active.stats.dayNumber} of ${active.stats.totalDays}`}
							</Text>
							<Text className="font-JakartaMedium text-[13px] text-[#574F47] mt-0.5">
								{DIET_INFO[resolveDietType(active.challenge.diet_type)].label} ·{' '}
								{shortDate(active.challenge.start_date)} – {shortDate(active.challenge.end_date)}
							</Text>
							<View
								className="h-2 rounded-full mt-3 overflow-hidden"
								style={{ backgroundColor: `${CHALLENGE_GREEN}2E` }}
							>
								<View
									className="h-full rounded-full"
									style={{
										backgroundColor: CHALLENGE_GREEN,
										width: `${(active.stats.completedDays / active.stats.totalDays) * 100}%`,
									}}
								/>
							</View>
							<View className="mt-3">
								<ChallengeCalendar days={active.days} />
							</View>
							<View className="flex-row mt-3">
								{[
									['Completed', `${active.stats.completedDays}/${active.stats.totalDays}`],
									['Missed', `${active.stats.missedDays}`],
									['Workouts', currentWeek ? `${currentWeek.workouts}/${currentWeek.goal}` : '–'],
								].map(([label, value]) => (
									<View key={label} style={{ flex: 1 }}>
										<Text
											className="text-[10px] font-JakartaSemiBold text-[#574F47]"
											style={EYEBROW}
										>
											{label}
										</Text>
										<Text className="font-JakartaExtraBold text-[17px] text-[#262135] mt-0.5">
											{value}
										</Text>
									</View>
								))}
							</View>
						</View>
					</View>
				</TouchableOpacity>
			) : (
				<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-5">
					<View className="w-12 h-12 rounded-full items-center justify-center bg-[#40C46322]">
						<Ionicons name="trophy" size={22} color="#30A14E" />
					</View>
					<Text className="font-JakartaExtraBold text-[20px] text-[#262135] mt-3">
						Start a macro challenge
					</Text>
					<Text className="font-JakartaMedium text-[13px] leading-5 text-[#3D3630] mt-1">
						Pick a length and a diet, stay under your macros every day and fill your calendar with
						green.
					</Text>
					<TouchableOpacity
						onPress={() => router.push('/challenge-setup')}
						className="bg-[#262135] rounded-xl py-3 mt-4 items-center"
					>
						<Text className="text-white font-JakartaBold text-[17px]" style={BUTTON_TEXT_SHADOW}>
							Start a challenge
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{!isHome && data.past.length > 0 && (
				<>
					<Text
						className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-7 mb-2 ml-1"
						style={EYEBROW}
					>
						Past challenges
					</Text>
					<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden">
						{data.past.map(({ challenge, stats }, i) => (
							<TouchableOpacity
								key={challenge.id}
								onPress={() =>
									router.push({ pathname: '/challenge', params: { id: String(challenge.id) } })
								}
								className={`flex-row items-center px-4 py-3.5 ${i < data.past.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''}`}
							>
								<View className="flex-1">
									<Text className="font-JakartaSemiBold text-[14px] text-[#262135]">
										{stats.totalDays}-day {DIET_INFO[resolveDietType(challenge.diet_type)].label}
									</Text>
									<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-0.5">
										{shortDate(challenge.start_date)} – {shortDate(challenge.end_date)} ·{' '}
										{challenge.status === 'ended' ? 'Ended early' : 'Completed'}
									</Text>
								</View>
								<Text className="font-JakartaBold text-[14px] text-[#262135] mr-2">
									{stats.completedDays}/{stats.totalDays}
								</Text>
								<Ionicons name="chevron-forward" size={16} color="#857869" />
							</TouchableOpacity>
						))}
					</View>
				</>
			)}
		</View>
	);
};

export default ChallengesPanel;
