import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';

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

interface VideoData {
	videoUrl: string;
	embedUrl: string;
	videoId: string;
	videoTitle: string;
	cached: boolean;
}

export default function ExerciseExecutionScreen() {
	const router = useRouter();
	const { id: sessionId, index } = useLocalSearchParams();
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
		index ? parseInt(index as string, 10) : 0
	);
	const [loading, setLoading] = useState(true);
	const [videoLoading, setVideoLoading] = useState(false);
	const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
	const [showVideo, setShowVideo] = useState(false);
	const [completedStates, setCompletedStates] = useState<boolean[]>([]);
	const lastSavedStatesRef = useRef<boolean[]>([]);

	const fetchSessionExercises = async () => {
		console.log(sessionId);
		if (!user || !sessionId) return;

		try {
			const result = await fetchAPI(
				`/api/workout-sessions?sessionId=${sessionId}&clerkId=${user.id}`
			);

			if (result.success) {
				setExercises(result.data.exercises);
				// Initialize completed states from database or default to false
				const initialStates = result.data.exercises.map(
					(exercise: Exercise) => exercise.exercise_completed || false
				);
				setCompletedStates(initialStates);
				lastSavedStatesRef.current = [...initialStates];
			} else {
				Alert.alert('Error', result.error || 'Failed to fetch exercises');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to fetch workout exercises');
		} finally {
			setLoading(false);
		}
	};

	const fetchExerciseVideo = async (exerciseName: string) => {
		if (!user) return;

		setVideoLoading(true);
		try {
			const result = await fetchAPI(
				`/api/exercise-videos?exercise=${encodeURIComponent(exerciseName)}`
			);

			if (result.success) {
				setCurrentVideo(result.data);
				setShowVideo(true);
			} else {
				Alert.alert('Error', result.error || 'Failed to fetch video');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to fetch exercise video');
		} finally {
			setVideoLoading(false);
		}
	};

	const completeExercise = async () => {
		if (!user || !exercises[currentExerciseIndex]) return;

		try {
			const result = await fetchAPI('/api/workout-sessions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exerciseId: exercises[currentExerciseIndex].id,
					completed: true,
					notes: completedStates[currentExerciseIndex]
						? 'Completed all reps'
						: 'Partial completion',
					sessionId: sessionId,
					clerkId: user?.id,
				}),
			});

			if (!result.success) {
				Alert.alert('Error', result.error || 'Failed to update exercise');
				return;
			}

			// Move to next exercise or complete workout
			if (currentExerciseIndex < exercises.length - 1) {
				setCurrentExerciseIndex(currentExerciseIndex + 1);
				setShowVideo(false);
				setCurrentVideo(null);
			} else {
				// All exercises completed, go to feedback screen
				router.push(`/workout-feedback/${sessionId}`);
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to complete exercise');
		}
	};

	const previousExercise = async () => {
		if (currentExerciseIndex === 0) return;

		try {
			const result = await fetchAPI('/api/workout-sessions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exerciseId: exercises[currentExerciseIndex].id,
					completed: true,
					notes: completedStates[currentExerciseIndex]
						? 'Completed all reps'
						: 'Partial completion',
					sessionId: sessionId,
					clerkId: user?.id,
				}),
			});

			if (!result.success) {
				Alert.alert('Error', result.error || 'Failed to update exercise');
				return;
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to complete exercise');
		}

		setCurrentExerciseIndex(currentExerciseIndex - 1);
	};

	const skipExercise = () => {
		if (currentExerciseIndex < exercises.length - 1) {
			setCurrentExerciseIndex(currentExerciseIndex + 1);
			setShowVideo(false);
			setCurrentVideo(null);
		} else {
			router.push(`/workout-feedback/${sessionId}`);
		}
	};

	useEffect(() => {
		fetchSessionExercises();
	}, [user, sessionId]);

	// Update current exercise index when index parameter changes
	useEffect(() => {
		if (index && exercises.length > 0) {
			const newIndex = parseInt(index as string, 10);
			if (newIndex >= 0 && newIndex < exercises.length) {
				setCurrentExerciseIndex(newIndex);
			}
		}
	}, [index, exercises.length]);

	// Helper function to save completion states to database (memoized)
	const saveCompletionStates = useCallback(
		async (states: boolean[]) => {
			if (!user || !sessionId) return;

			// Check if states have actually changed
			const hasChanged = states.some((state, index) => state !== lastSavedStatesRef.current[index]);

			if (!hasChanged) {
				return; // No changes, skip API call
			}

			try {
				await fetchAPI('/api/workout-sessions', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						sessionId: sessionId,
						clerkId: user.id,
						completionStates: states,
					}),
				});

				// Update the reference to track what was last saved
				lastSavedStatesRef.current = [...states];
			} catch (error) {
				console.error('Failed to save completion states:', error);
			}
		},
		[user, sessionId]
	);

	// Helper function to update completion state for specific exercise
	const updateExerciseCompletion = (exerciseIndex: number, isCompleted: boolean) => {
		setCompletedStates(prev => {
			const newStates = [...prev];
			newStates[exerciseIndex] = isCompleted;
			// Save to database
			saveCompletionStates(newStates);
			return newStates;
		});
	};

	// Get current exercise completion state
	const currentExerciseCompleted = completedStates[currentExerciseIndex] || false;

	const currentExercise = exercises[currentExerciseIndex];

	if (loading) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Loading workout...</Text>
			</View>
		);
	}

	if (!currentExercise) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">No exercises found</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
			{/* Header */}
			<View className="flex-row items-center justify-between p-6 border-b border-gray-200">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#374151" />
				</TouchableOpacity>
				<Text className="text-lg font-JakartaSemiBold">
					Exercise {currentExerciseIndex + 1} of {exercises.length}
				</Text>
				<TouchableOpacity onPress={skipExercise}>
					<Text className="text-blue-500 font-JakartaSemiBold">Skip</Text>
				</TouchableOpacity>
			</View>

			<ScrollView className="flex-1">
				{/* Exercise Info */}
				<View className="p-6 ">
					<Text className="text-2xl font-JakartaBold text-gray-800 mb-2">
						{currentExercise.exercise_name}
					</Text>
					<Text className="text-lg text-gray-600 mb-4">
						{currentExercise.sets} sets × {currentExercise.reps} reps
					</Text>

					{/* Muscle Groups */}
					<View className="flex-row flex-wrap gap-2">
						{currentExercise.muscle_groups.map(muscle => (
							<View key={muscle} className="px-3 py-1 bg-blue-100 rounded-full">
								<Text className="text-sm font-JakartaSemiBold text-blue-800 capitalize">
									{muscle}
								</Text>
							</View>
						))}
					</View>
				</View>

				{/* Video Section */}
				<View className="px-6">
					<View className="flex-row items-center justify-between mb-4">
						<Text className="text-lg font-JakartaBold text-gray-800">Exercise Tutorial</Text>
					</View>

					{showVideo && currentVideo ? (
						<View className="bg-gray-100 rounded-xl overflow-hidden mb-4">
							<WebView
								source={{ uri: currentVideo.embedUrl }}
								style={{ height: 200 }}
								allowsFullscreenVideo={true}
								mediaPlaybackRequiresUserAction={false}
							/>
							<View className="p-3 bg-white">
								<Text className="font-JakartaSemiBold text-gray-800">
									{currentVideo.videoTitle}
								</Text>
							</View>
						</View>
					) : (
						<View className="bg-gray-100 h-[200px] rounded-xl overflow-hidden mb-4 flex justify-center items-center">
							<TouchableOpacity
								onPress={() => fetchExerciseVideo(currentExercise.exercise_name)}
								disabled={videoLoading}
								className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
							>
								<Ionicons name="play" size={16} color="white" />
								<Text className="text-white font-JakartaSemiBold ">
									{videoLoading ? 'Loading...' : ''}
								</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* Exercise Instructions */}
				<View className="p-6 bg-gray-50">
					<Text className="text-lg font-JakartaBold text-gray-800 mb-3">Instructions</Text>
					<View className="space-y-2">
						<View className="flex-row items-center">
							<Ionicons name="fitness" size={16} color="#6B7280" />
							<Text className="text-gray-700 ml-2">
								Perform {currentExercise.sets} sets of {currentExercise.reps} reps
							</Text>
						</View>
						<View className="flex-row items-center">
							<Ionicons name="time" size={16} color="#6B7280" />
							<Text className="text-gray-700 ml-2">
								Rest {currentExercise.rest_seconds} seconds between sets
							</Text>
						</View>
						<View className="flex-row items-center">
							<Ionicons name="checkmark-circle" size={16} color="#6B7280" />
							<Text className="text-gray-700 ml-2">
								Focus on proper form and controlled movement
							</Text>
						</View>
					</View>
				</View>

				{/* Completion Question */}
				<View className="px-6 py-2">
					<Text className="text-lg font-JakartaBold text-gray-800 mb-4">
						Did you complete all reps?
					</Text>

					<View className="flex-row space-x-4">
						<TouchableOpacity
							onPress={() => updateExerciseCompletion(currentExerciseIndex, true)}
							className={`flex-1 py-4 rounded-xl border-2 ${
								currentExerciseCompleted === true
									? 'border-green-500 bg-green-50'
									: 'border-gray-200 bg-white'
							}`}
						>
							<Text
								className={`font-JakartaBold text-center ${
									currentExerciseCompleted === true ? 'text-green-600' : 'text-gray-700'
								}`}
							>
								Yes, I completed all reps
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => updateExerciseCompletion(currentExerciseIndex, false)}
							className={`flex-1 py-4 rounded-xl border-2 ${
								currentExerciseCompleted === false
									? 'border-orange-500 bg-orange-50'
									: 'border-gray-200 bg-white'
							}`}
						>
							<Text
								className={`font-JakartaBold text-center ${
									currentExerciseCompleted === false ? 'text-orange-600' : 'text-gray-700'
								}`}
							>
								No, I couldn't finish
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>

			{/* Complete Button */}
			<View className="pb-6 border-t border-gray-200 flex flex-row justify-center gap-4">
				{currentExerciseIndex > 0 ? (
					<TouchableOpacity
						onPress={previousExercise}
						className="bg-orange-400 w-1/3 p-4 rounded-xl"
					>
						<Text className="text-white font-JakartaBold text-center ">
							{currentExerciseIndex > 0 ? 'Prev Exercise' : ''}
						</Text>
					</TouchableOpacity>
				) : (
					''
				)}

				<TouchableOpacity
					onPress={completeExercise}
					className="bg-green-500 flex justify-center min-w-1/3 items-center p-4 rounded-xl"
				>
					<Text className="text-white font-JakartaBold text-center ">
						{currentExerciseIndex < exercises.length - 1 ? 'Next Exercise' : 'Complete Workout'}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
