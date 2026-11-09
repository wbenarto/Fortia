import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';
import type { UserWorkoutSummary } from '@/lib/workoutBuilder';
import TodayWorkoutCard from '@/components/workout/TodayWorkoutCard';
import InProgressWorkoutCard from '@/components/workout/InProgressWorkoutCard';
import SectionTitle from '@/components/progress/SectionTitle';

const ACCENT = '#E3BBA1';

const STATUS_LABEL: Record<UserWorkoutSummary['status'], string> = {
	planned: 'Start',
	in_progress: 'Resume',
	completed: 'Done',
};

// Entry point to the workout builder plus today's open workouts (planned / in progress).
// Completed workouts are left out: they're logged as activities (exercise list,
// calories burned, Progress), and older unfinished plans drop off the next day.
// What the builder lets you pick — shown as chips on the card
const BUILDER_CHIPS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
	{ icon: 'time-outline', label: 'Time' },
	{ icon: 'body-outline', label: 'Focus' },
	{ icon: 'barbell-outline', label: 'Equipment' },
];

const ActivitiesSection = ({ variant = 'home' }: { variant?: 'home' | 'activity' }) => {
	const { user } = useUser();
	const [workouts, setWorkouts] = useState<UserWorkoutSummary[]>([]);
	const openOnly = variant === 'activity';

	const fetchWorkouts = useCallback(() => {
		if (!user?.id) return;
		fetchAPI(`/api/user-workouts?clerkId=${user.id}&limit=10`, {
			method: 'GET',
		})
			.then(response => {
				const list: UserWorkoutSummary[] = response.success ? response.data : [];
				const today = getTodayDate();
				setWorkouts(
					list
						.filter(w => w.status !== 'completed' && getLocalDate(w.created_at) === today)
						.slice(0, 3)
				);
			})
			.catch(err => console.error('Failed to load workouts:', err));
	}, [user?.id, openOnly]);

	useRefetchOnFocus(fetchWorkouts, `${user?.id}|${variant}`);

	// The started workout gets its own card at the top; the list below is only planned ones
	const inProgress = workouts.find(w => w.status === 'in_progress');
	const planned = workouts.filter(w => w.status === 'planned');

	return (
		<View className={openOnly ? 'mt-10' : 'px-6 mt-12'}>
			{openOnly ? (
				<Text
					className="text-[10px] font-JakartaSemiBold text-[#574F47] mb-3"
					style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
				>
					Workouts
				</Text>
			) : (
				<SectionTitle title="Workouts" tab="activity" className="mb-4" />
			)}

			{inProgress && <InProgressWorkoutCard workoutId={inProgress.id} title={inProgress.title} />}

			<TodayWorkoutCard />

			{/* Custom builder entry: soft accent wash, what you get to choose, arrow button */}
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={() => router.push('/workout-builder')}
				className="rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden"
				accessibilityRole="button"
				accessibilityLabel="Build a custom workout"
			>
				<LinearGradient
					colors={[`${ACCENT}40`, '#FFFFFF']}
					start={{ x: 0, y: 0 }}
					end={{ x: 0.6, y: 1 }}
					style={{ padding: 16 }}
				>
					<View className="flex-row items-center">
						<View
							className="w-11 h-11 rounded-full items-center justify-center bg-white"
							style={{ borderWidth: 1, borderColor: '#F0EBE6' }}
						>
							<Ionicons name="options-outline" size={20} color="#B07F62" />
						</View>
						<View className="flex-1 mx-3">
							<Text className="font-JakartaExtraBold text-[16px] text-[#262135]">
								Build a custom workout
							</Text>
							<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-0.5">
								You choose, your trainer plans the exercises
							</Text>
						</View>
						<View className="w-9 h-9 rounded-full items-center justify-center bg-[#262135]">
							<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
						</View>
					</View>

					<View className="flex-row mt-3.5" style={{ columnGap: 6 }}>
						{BUILDER_CHIPS.map(chip => (
							<View
								key={chip.label}
								className="flex-row items-center bg-white rounded-full px-2.5 py-1"
								style={{ borderWidth: 1, borderColor: '#F0EBE6' }}
							>
								<Ionicons name={chip.icon} size={12} color="#574F47" />
								<Text className="ml-1 font-JakartaSemiBold text-[11px] text-[#574F47]">
									{chip.label}
								</Text>
							</View>
						))}
					</View>
				</LinearGradient>
			</TouchableOpacity>

			{planned.length > 0 && (
				<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] mt-3 overflow-hidden">
					{planned.map((workout, index) => {
						const done = workout.status === 'completed';
						return (
							<TouchableOpacity
								key={workout.id}
								activeOpacity={0.7}
								onPress={() => router.push(`/training/${workout.id}`)}
								className={`flex-row items-center px-4 py-3.5 ${
									index < planned.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
								}`}
							>
								<View className="flex-1 pr-3">
									<Text className="font-JakartaSemiBold text-sm text-[#262135]" numberOfLines={1}>
										{workout.title}
									</Text>
									<Text className="font-JakartaMedium text-xs text-[#574F47] mt-0.5">
										{done && workout.calories != null
											? `${workout.calories} kcal burned`
											: `~${workout.est_minutes} min · ${workout.exercise_count} exercises`}
									</Text>
								</View>
								<View
									className="flex-row items-center rounded-full px-3 py-1"
									style={{ backgroundColor: done ? '#7DB88A1F' : `${ACCENT}33` }}
								>
									{done && (
										<Ionicons
											name="checkmark"
											size={12}
											color="#7DB88A"
											style={{ marginRight: 3 }}
										/>
									)}
									<Text
										className="font-JakartaSemiBold text-[11px]"
										style={{ color: done ? '#5E9A6C' : '#B07F62' }}
									>
										{STATUS_LABEL[workout.status]}
									</Text>
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
			)}
		</View>
	);
};

export default ActivitiesSection;
