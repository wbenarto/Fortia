import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	RefreshControl,
	Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WorkoutProgram {
	id: number;
	program_name: string;
	program_goal: string;
	total_weeks: number;
	sessions_per_week: number;
	session_duration: number;
	workout_days: string[];
	available_equipment: string[];
	status: string;
	start_date: string;
	created_at: string;
	muscle_balance_target: any;
	currentWeek: number;
	sessions: WorkoutSession[];
}

interface WorkoutSession {
	id: number;
	title: string;
	week_number: number;
	session_number: number;
	session_duration: number;
	phase_name: string;
	completion_status: string;
	scheduled_date: string;
	warm_up_video_url: string;
}

export default function WorkoutProgramDetailScreen({ programId }: { programId: string }) {
	console.log(programId);
	const [program, setProgram] = useState<WorkoutProgram | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [weeklyProgram, setWeeklyProgram] = useState<
		{ week: number; sessions: WorkoutSession[] }[] | null
	>(null);
	const router = useRouter();
	const { user } = useUser();

	const insets = useSafeAreaInsets();

	const fetchProgram = async () => {
		if (!user) return;
		try {
			const result = await fetchAPI(
				`/api/workout-programs?clerkId=${user.id}&programId=${programId}`
			);

			if (result.success && result.data) {
				setProgram(result.data[0]);
			} else {
				Alert.alert('Error', 'Failed to fetch program');
			}
		} catch (error) {
			console.error(`Failed to fetch program of id ${programId}`);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchProgram();
	}, [user, programId]);

	// Add this useEffect to group sessions when program changes
	useEffect(() => {
		if (program?.sessions) {
			const groupSessionsByWeek = (sessions: WorkoutSession[]) => {
				const grouped = sessions.reduce(
					(acc, session) => {
						const week = session.week_number;
						if (!acc[week]) {
							acc[week] = [];
						}
						acc[week].push(session);
						return acc;
					},
					{} as Record<number, WorkoutSession[]>
				);
				return Object.entries(grouped)
					.map(([week, sessions]) => ({
						week: parseInt(week),
						sessions: sessions,
					}))
					.sort((a, b) => a.week - b.week);
			};

			const weeklySessions = groupSessionsByWeek(program.sessions);
			setWeeklyProgram(weeklySessions);
		}
	}, [program]);

	const startWorkout = (session: WorkoutSession) => {
		router.push(`/workout-session/${session.id}`);
	};

	if (loading) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Loading programs...</Text>
			</View>
		);
	}

	console.log(Object.keys(program.sessions['0']));
	return (
		<ScrollView style={{ paddingTop: insets.top }} className="mb-10">
			<View className="flex-row relative items-center justify-center py-4 ">
				<TouchableOpacity className="absolute left-4 pt-2 z-10" onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#black" />
				</TouchableOpacity>
				<Text className="text-xl text-center font-JakartaBold">{program.program_name}</Text>
			</View>
			<View className="px-4">
				<View className="flex-row justify-between mb-4 px-20">
					<View className="items-center">
						<Text className="text-xl text-black font-JakartaBold">{program.total_weeks}</Text>
						<Text className="text-xs text-black">Weeks</Text>
					</View>
					<View className="items-center">
						<Text className="text-xl text-black font-JakartaBold">{program.sessions_per_week}</Text>
						<Text className="text-xs text-black">Sessions/Week</Text>
					</View>
					<View className="items-center">
						<Text className="text-lg text-black font-JakartaBold ">{program.session_duration}</Text>
						<Text className="text-xs text-black">Mins</Text>
					</View>
				</View>
				<View
					className={`mb-4 ${program.status === 'active' ? 'bg-green-700' : 'bg-gray-600'} py-2 rounded-lg`}
				>
					<Text className="text-center font-JakartaSemiBold tracking-wider text-white ">
						{program.status.charAt(0).toUpperCase() + program.status.slice(1)}
					</Text>
				</View>
				<View className="flex-row items-center mb-3">
					<Text className=" mr-2">Equipment Required: </Text>
					<View className="flex-row flex-wrap gap-1">
						{program.available_equipment.map((e, i) => {
							return (
								<View className="px-4 py-1 self-start rounded-full border-[1px] border-gray-500">
									<Text>{e}</Text>
								</View>
							);
						})}
					</View>
				</View>
				<View className="flex-row items-center">
					<Text className=" mr-2">Days Scheduled: </Text>
					<View className="flex-row flex-wrap space-x-1">
						{program.workout_days.map((e, i) => {
							return (
								<View className="px-4 py-1 self-start rounded-full border-[1px] border-gray-500">
									<Text>{e}</Text>
								</View>
							);
						})}
					</View>
				</View>

				{weeklyProgram?.map((e, i) => {
					return (
						<View className="my-2 px-2 ">
							<Text className="text-lg mb-1 font-JakartaBold">Week {e.week}</Text>
							{e.sessions.map(e => {
								return (
									<View className="flex-row  justify-between items-center border-[1px] border-solid border-gray-400 mb-2 p-1 px-2 rounded-xl">
										<View>
											<Text className="font-JakartaSemiBold">{e.title}</Text>
											<Text>
												{new Date(e.scheduled_date).toLocaleDateString('en-US', {
													weekday: 'short',
													month: 'short',
													day: 'numeric',
												})}
											</Text>
											<Text>
												{e.completion_status === 'in_progress'
													? 'in progress'
													: e.completion_status}
											</Text>
										</View>

										<TouchableOpacity
											key={e.id}
											onPress={() => startWorkout(e)}
											className="flex-row items-center justify-between p-3 bg-green-400 rounded-lg "
										>
											<Text>Start Session</Text>
										</TouchableOpacity>
									</View>
								);
							})}
						</View>
					);
				})}
			</View>
		</ScrollView>
	);
}
