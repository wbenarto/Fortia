import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { UserWorkoutSummary } from '@/lib/workoutBuilder';
import TodayWorkoutCard from '@/components/workout/TodayWorkoutCard';
import SectionTitle from '@/components/progress/SectionTitle';

const ACCENT = '#E3BBA1';

const STATUS_LABEL: Record<UserWorkoutSummary['status'], string> = {
	planned: 'Start',
	in_progress: 'Resume',
	completed: 'Done',
};

// Entry point to the workout builder plus recent workouts.
// - 'home' (Home → Activities): the last 3 workouts, any status.
// - 'activity' (Activity tab → Workouts): only planned / in-progress ones — finished
//   workouts already show in that screen's exercise list as logged activities.
const ActivitiesSection = ({ variant = 'home' }: { variant?: 'home' | 'activity' }) => {
	const { user } = useUser();
	const [workouts, setWorkouts] = useState<UserWorkoutSummary[]>([]);
	const openOnly = variant === 'activity';

	const fetchWorkouts = useCallback(() => {
		if (!user?.id) return;
		fetchAPI(`/api/user-workouts?clerkId=${user.id}&limit=${openOnly ? 10 : 3}`, {
			method: 'GET',
		})
			.then(response => {
				const list: UserWorkoutSummary[] = response.success ? response.data : [];
				setWorkouts(openOnly ? list.filter(w => w.status !== 'completed').slice(0, 3) : list);
			})
			.catch(err => console.error('Failed to load workouts:', err));
	}, [user?.id, openOnly]);

	useRefetchOnFocus(fetchWorkouts, `${user?.id}|${variant}`);

	return (
		<View className={openOnly ? 'mt-10' : 'px-6 mt-12'}>
			{openOnly ? (
				<Text
					className="text-[10px] font-JakartaSemiBold text-[#94897E] mb-3"
					style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
				>
					Workouts
				</Text>
			) : (
				<SectionTitle title="Activities" tab="activity" className="mb-4" />
			)}

			<TodayWorkoutCard />

			<TouchableOpacity
				activeOpacity={0.85}
				onPress={() => router.push('/workout-builder')}
				className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 flex-row items-center"
				accessibilityRole="button"
				accessibilityLabel="Build a workout"
			>
				<View
					className="w-11 h-11 rounded-full items-center justify-center"
					style={{ backgroundColor: `${ACCENT}33` }}
				>
					<Ionicons name="sparkles" size={20} color="#cd9c99" />
				</View>
				<View className="flex-1 mx-3">
					<Text className="font-JakartaBold text-[15px] text-[#262135]">Build a workout</Text>
					<Text className="font-JakartaMedium text-xs text-[#94897E] mt-0.5">
						Your trainer plans it around your time and equipment
					</Text>
				</View>
				<Ionicons name="chevron-forward" size={18} color="#C9BEB4" />
			</TouchableOpacity>

			{workouts.length > 0 && (
				<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] mt-3 overflow-hidden">
					{workouts.map((workout, index) => {
						const done = workout.status === 'completed';
						return (
							<TouchableOpacity
								key={workout.id}
								activeOpacity={0.7}
								onPress={() => router.push(`/training/${workout.id}`)}
								className={`flex-row items-center px-4 py-3.5 ${
									index < workouts.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
								}`}
							>
								<View className="flex-1 pr-3">
									<Text className="font-JakartaSemiBold text-sm text-[#262135]" numberOfLines={1}>
										{workout.title}
									</Text>
									<Text className="font-JakartaMedium text-xs text-[#94897E] mt-0.5">
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
