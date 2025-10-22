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

export default function WorkoutProgramScreen() {
	const router = useRouter();
	const { user } = useUser();
	const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const insets = useSafeAreaInsets();

	const fetchPrograms = async () => {
		if (!user) return;

		try {
			const result = await fetchAPI(`/api/workout-programs?clerkId=${user.id}`);
			console.log(result);
			if (result.success) {
				setPrograms(result.data || []);
			} else {
				// Only show error for actual failures, not empty results
				console.error('API Error:', result.error);
				setPrograms([]);
			}
		} catch (error) {
			console.error('Failed to fetch workout programs:', error);
			// Don't show alert for network errors - just set empty array
			setPrograms([]);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchPrograms();
	}, [user]);

	// Note: Removed useFocusEffect to prevent duplicate program fetching
	// Programs will refresh when user navigates back from program deletion

	const onRefresh = () => {
		setRefreshing(true);
		fetchPrograms();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'in_progress':
				return 'bg-blue-100 text-blue-800';
			case 'scheduled':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-green-100 text-gray-800';
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'completed':
				return 'checkmark-circle';
			case 'in_progress':
				return 'play-circle';
			case 'scheduled':
				return 'time';
			default:
				return 'time';
		}
	};

	if (loading) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Loading programs...</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
			{/* Header */}
			<View className="flex-row relative items-center justify-center py-4">
				<TouchableOpacity className="absolute left-4 pt-2 z-10" onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#black" />
				</TouchableOpacity>
				<Text className="text-xl text-center font-JakartaBold">Workout Programs</Text>
				{/* <TouchableOpacity
					onPress={() => router.push('/workout-program-creation')}
					className="bg-blue-500 px-4 py-2 rounded-xl"
				>
					<Text className="text-white font-JakartaSemiBold">Create New</Text>
				</TouchableOpacity> */}
			</View>

			{programs.length === 0 ? (
				<View className="flex-1 items-center justify-center p-6">
					<Ionicons name="fitness" size={64} color="#9CA3AF" />
					<Text className="text-xl font-JakartaSemiBold text-gray-600 mt-4 mb-2">
						No Programs Yet
					</Text>
					<Text className="text-gray-500 text-center mb-6">
						Create your first AI-powered workout program to get started
					</Text>
					<TouchableOpacity
						onPress={() => router.push('/workout-program-creation')}
						className="bg-blue-500 px-6 py-3 rounded-xl"
					>
						<Text className="text-white font-JakartaSemiBold">Create Program</Text>
					</TouchableOpacity>
				</View>
			) : (
				<ScrollView
					className="flex-1"
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				>
					{programs.map(program => (
						// Program Card
						<View
							key={program.id}
							className="m-4 rounded-xl max-h-[200px] overflow-hidden flex-row"
						>
							<View className="w-1/3  bg-blue-100">
								<Image
									source={require('@/assets/images/back-exercise.png')}
									className="w-full h-full object-contain "
									alt="workout-program"
								/>
							</View>
							{/* Right column */}
							<View className="p-2 flex-1 bg-gray-800 flex justify-between">
								{/* Program Header */}
								<View className=" mb-3">
									<Text
										className="text-lg font-JakartaSemiBold mb-1 text-white"
										numberOfLines={1}
										ellipsizeMode="tail"
									>
										{program.program_name}
									</Text>
									<View
										className={`py-1 px-3 self-start border-[1px] border-gray-400 rounded-full ${getStatusColor(program.status)} `}
									>
										<Text className="text-xs text-center text-gray-600">{program.status}</Text>
									</View>
								</View>

								{/* Program Stats */}
								<View className="flex-row justify-between mb-4 px-2">
									<View className="items-center">
										<Text className="text-xl text-white font-JakartaBold">
											{program.total_weeks}
										</Text>
										<Text className="text-xs text-white">Weeks</Text>
									</View>
									<View className="items-center">
										<Text className="text-xl text-white font-JakartaBold">
											{program.sessions_per_week}
										</Text>
										<Text className="text-xs text-white">Sessions/Week</Text>
									</View>
									<View className="items-center">
										<Text className="text-lg text-white font-JakartaBold ">
											{program.session_duration}
										</Text>
										<Text className="text-xs text-white">Mins</Text>
									</View>
								</View>

								{/* Current Week Sessions */}
								{/* <View className="mb-4">
								<Text className="text-sm font-JakartaSemiBold text-gray-700 mb-2">
									Week {program.currentWeek} Sessions
								</Text>
								{program.sessions.map(session => (
									<TouchableOpacity
										key={session.id}
										onPress={() => startWorkout(session)}
										className="flex-row items-center justify-between p-3 bg-white rounded-lg mb-2"
									>
										<View className="flex-1">
											<Text className="font-JakartaSemiBold text-gray-800">{session.title}</Text>
											<Text className="text-sm text-gray-600">
												{session.phase_name} • Session {session.session_number}
											</Text>
											{session.scheduled_date && (
												<Text className="text-xs text-blue-600 mt-1">
													{new Date(session.scheduled_date).toLocaleDateString('en-US', {
														weekday: 'short',
														month: 'short',
														day: 'numeric',
													})}
												</Text>
											)}
										</View>
										<View className="flex-row items-center">
											<Ionicons
												name={getStatusIcon(session.completion_status)}
												size={20}
												color={
													session.completion_status === 'completed'
														? '#10B981'
														: session.completion_status === 'in_progress'
															? '#3B82F6'
															: '#6B7280'
												}
											/>
											<Ionicons name="chevron-forward" size={16} color="#9CA3AF" className="ml-2" />
										</View>
									</TouchableOpacity>
								))}
							</View> */}

								{/* Program Actions */}
								<View className="flex-row  space-x-2">
									<TouchableOpacity
										onPress={() => {
											console.log(
												'Navigating to program with ID:',
												program.id,
												'Type:',
												typeof program.id
											);
											router.push(`/workout-program/${program.id}`);
										}}
										className="flex-1 bg-[#cd9c99] py-2 rounded-lg"
									>
										<Text className="text-white font-JakartaSemiBold text-center">
											View Program
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					))}
				</ScrollView>
			)}
		</View>
	);
}
