import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';
import MuscleBalanceBarChart from './MuscleBalancePieChart';

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
	program_name: string;
	program_goal: string;
	muscle_balance_target: any;
}

interface Exercise {
	id: number;
	exercise_name: string;
	sets: number;
	reps: number;
	rest_seconds: number;
	order_index: number;
	muscle_groups: string[];
	video_url: string;
	exercise_completed: boolean;
	completion_notes: string;
}

export default function WorkoutSessionDetailScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { id: sessionId } = useLocalSearchParams();
	const { user } = useUser();
	const [session, setSession] = useState<WorkoutSession | null>(null);
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchSessionDetails = async () => {
		if (!user || !sessionId) return;
		console.log(session);

		try {
			const result = await fetchAPI(
				`/api/workout-sessions?sessionId=${sessionId}&clerkId=${user.id}`
			);
			console.log(result);

			if (result.success) {
				setSession(result.data.session);
				setExercises(result.data.exercises);
			} else {
				Alert.alert('Error', result.error || 'Failed to fetch session details');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to fetch workout session');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSessionDetails();
	}, [user, sessionId]);

	const startWorkout = () => {
		if (sessionId) {
			router.push(`/workout-execution/${sessionId}` as any);
		}
	};

	const goToExercise = (index: number) => {
		if (sessionId) {
			router.push(`/workout-execution/${sessionId}?index=${index}` as any);
		}
	};

	const getMuscleGroupColor = (muscleGroup: string) => {
		const colors: { [key: string]: string } = {
			chest: 'bg-red-100 text-red-800',
			back: 'bg-blue-100 text-blue-800',
			legs: 'bg-green-100 text-green-800',
			shoulders: 'bg-yellow-100 text-yellow-800',
			arms: 'bg-purple-100 text-purple-800',
			core: 'bg-orange-100 text-orange-800',
		};
		return colors[muscleGroup.toLowerCase()] || 'bg-gray-100 text-gray-800';
	};

	if (loading) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#black" />
					</TouchableOpacity>
					<Text className="text-black text-lg font-JakartaSemiBold">Session</Text>
					<View style={{ width: 24 }} />
				</View>
				<Text className="text-gray-500">Loading session...</Text>
			</View>
		);
	}

	if (!session) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Session not found</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
			{/* Header */}
			<View className="flex-row items-center justify-between p-4">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#374151" />
				</TouchableOpacity>
				<Text className="text-lg font-JakartaSemiBold">Workout Details</Text>
				<View className="w-6" />
			</View>

			<ScrollView className="flex-1">
				{/* Session Info */}
				<View className="px-6 pb-6 border-b border-gray-200">
					<Text className="text-2xl font-JakartaBold text-gray-800 mb-2">{session.title}</Text>
					<Text className="text-gray-600 mb-4">
						{session.program_name} • Week {session.week_number} • Session {session.session_number}
					</Text>

					<View className="flex-row items-center">
						<View className="flex-row gap-1 mr-2">
							<Ionicons name="time" size={16} color="#6B7280" />
							<Text>{session.session_duration} mins</Text>
						</View>
						<View
							className={`px-3 py-1 rounded-full ${
								session.completion_status === 'completed'
									? 'bg-green-100'
									: session.completion_status === 'in_progress'
										? 'bg-yellow-300'
										: 'bg-gray-100'
							}`}
						>
							<Text
								className={`text-sm font-JakartaSemiBold ${
									session.completion_status === 'completed'
										? 'text-green-800'
										: session.completion_status === 'in_progress'
											? 'text-blue-800'
											: 'text-gray-800'
								}`}
							>
								{session.completion_status === 'completed'
									? 'Completed'
									: session.completion_status === 'in_progress'
										? 'In Progress'
										: 'Scheduled'}
							</Text>
						</View>
					</View>
				</View>

				{/* Warm-up Section */}
				{session.warm_up_video_url && (
					<View className="px-6 pt-4 ">
						<Text className="text-lg font-JakartaBold text-gray-800 mb-3">Warm-up</Text>
						<TouchableOpacity className="flex-row items-center p-4 bg-orange-50 rounded-xl">
							<Ionicons name="play-circle" size={24} color="#F97316" />
							<View className="ml-3 flex-1">
								<Text className="font-JakartaSemiBold text-gray-800">Dynamic Stretching</Text>
								<Text className="text-sm text-gray-600">Watch tutorial and perform warm-up</Text>
							</View>
							<Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
						</TouchableOpacity>
					</View>
				)}

				{/* Exercises */}
				<View className="p-6">
					<Text className="text-lg font-JakartaBold text-gray-800 mb-4">
						Exercises ({exercises.length})
					</Text>

					{exercises.map((exercise, index) => (
						<TouchableOpacity
							onPress={() => goToExercise(index)}
							key={exercise.id}
							className="mb-4 p-4 bg-gray-50 rounded-xl"
						>
							<View className=" ">
								<View className="flex flex-row justify-between items-center">
									<Text className="mb-1 font-JakartaSemiBold text-gray-800">
										{exercise.exercise_name}
									</Text>
									<View className="flex-row items-center">
										{exercise.exercise_completed && (
											<Ionicons name="checkmark-circle" size={20} color="#10B981" />
										)}
									</View>
								</View>

								<View className="flex-1 flex flex-row">
									<Text className="text-sm text-gray-600 mr-4">
										{exercise.sets} sets × {exercise.reps} reps
									</Text>
									<View className="flex-row items-center">
										<Ionicons name="time" size={12} color="#6B7280" />
										<Text className="text-sm text-gray-600 ml-1">
											{exercise.rest_seconds}s rest
										</Text>
									</View>
								</View>
							</View>

							{/* Muscle Groups */}
							<View className="flex-row flex-wrap gap-2 mt-2">
								{exercise.muscle_groups.map(muscle => (
									<View
										key={muscle}
										className={`px-2 py-1 rounded-full ${getMuscleGroupColor(muscle)}`}
									>
										<Text className="text-xs font-JakartaSemiBold capitalize">{muscle}</Text>
									</View>
								))}
							</View>

							{/* Exercise Details */}
							<View className="flex-row justify-between items-center"></View>
						</TouchableOpacity>
					))}
				</View>

				{/* Muscle Balance Target */}
				{session.muscle_balance_target && (
					<View className="p-6 bg-gray-100">
						<Text className="text-lg font-JakartaBold text-gray-800 mb-4 text-center">
							Target Muscle Balance
						</Text>
						<MuscleBalanceBarChart muscleBalance={session.muscle_balance_target} />
					</View>
				)}
			</ScrollView>

			{/* Start Workout Button */}
			{session.completion_status !== 'completed' && (
				<View className="pb-6 pt-4 border-t border-gray-200  flex justify-center items-center">
					<TouchableOpacity
						onPress={startWorkout}
						className="bg-blue-500 px-4 py-4 w-1/2 rounded-xl"
					>
						<Text className="text-white font-JakartaBold text-center ">
							{session.completion_status === 'in_progress' ? 'Continue Workout' : 'Start Workout'}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}
