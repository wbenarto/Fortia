import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';

const DIFFICULTY_OPTIONS = [
	{
		value: 'easy',
		label: 'Too Easy',
		description: 'I could have done more',
		color: 'bg-green-100 text-green-800',
	},
	{
		value: 'just_right',
		label: 'Just Right',
		description: 'Perfect challenge level',
		color: 'bg-blue-100 text-blue-800',
	},
	{
		value: 'hard',
		label: 'Too Hard',
		description: 'I struggled to complete it',
		color: 'bg-red-100 text-red-800',
	},
];

export default function PostWorkoutFeedbackScreen() {
	const router = useRouter();
	const { sessionId } = useLocalSearchParams();
	const { user } = useUser();
	const [difficulty, setDifficulty] = useState<string>('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);

	const submitFeedback = async () => {
		if (!user || !sessionId || !difficulty) {
			Alert.alert('Error', 'Please select a difficulty rating');
			return;
		}

		setLoading(true);
		try {
			const result = await fetchAPI('/api/workout-sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: parseInt(sessionId as string),
					clerkId: user.id,
					exercises: [], // We'll get this from the session
					difficultyRating: difficulty,
					notes: notes.trim() || null,
				}),
			});

			if (result.success) {
				Alert.alert(
					'Workout Complete!',
					'Great job! Your feedback helps us improve your future workouts.',
					[
						{
							text: 'View Progress',
							onPress: () => router.push('/workout-programs'),
						},
					]
				);
			} else {
				Alert.alert('Error', result.error || 'Failed to submit feedback');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to submit workout feedback');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View className="flex-1 bg-white">
			{/* Header */}
			<View className="flex-row items-center justify-between p-6 border-b border-gray-200">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#374151" />
				</TouchableOpacity>
				<Text className="text-lg font-JakartaSemiBold">Workout Complete!</Text>
				<View className="w-6" />
			</View>

			<ScrollView className="flex-1">
				{/* Success Message */}
				<View className="p-6 bg-green-50">
					<View className="flex-row items-center mb-3">
						<Ionicons name="checkmark-circle" size={32} color="#10B981" />
						<Text className="text-xl font-JakartaBold text-green-800 ml-3">Congratulations!</Text>
					</View>
					<Text className="text-green-700">
						You've completed your workout. Your feedback helps our AI create better programs for
						you.
					</Text>
				</View>

				{/* Difficulty Rating */}
				<View className="p-6">
					<Text className="text-xl font-JakartaBold text-gray-800 mb-4">
						How was the difficulty?
					</Text>
					<Text className="text-gray-600 mb-6">
						This helps us adjust future workouts to match your fitness level
					</Text>

					<View className="space-y-3">
						{DIFFICULTY_OPTIONS.map(option => (
							<TouchableOpacity
								key={option.value}
								onPress={() => setDifficulty(option.value)}
								className={`p-4 rounded-xl border-2 ${
									difficulty === option.value
										? 'border-blue-500 bg-blue-50'
										: 'border-gray-200 bg-white'
								}`}
							>
								<View className="flex-row items-center">
									<View
										className={`w-6 h-6 rounded-full border-2 mr-3 ${
											difficulty === option.value
												? 'border-blue-500 bg-blue-500'
												: 'border-gray-300'
										}`}
									>
										{difficulty === option.value && (
											<View className="w-2 h-2 bg-white rounded-full m-1" />
										)}
									</View>
									<View className="flex-1">
										<Text
											className={`font-JakartaSemiBold ${
												difficulty === option.value ? 'text-blue-600' : 'text-gray-800'
											}`}
										>
											{option.label}
										</Text>
										<Text className="text-sm text-gray-600 mt-1">{option.description}</Text>
									</View>
								</View>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Additional Notes */}
				<View className="p-6">
					<Text className="text-lg font-JakartaBold text-gray-800 mb-3">
						Additional Notes (Optional)
					</Text>
					<Text className="text-gray-600 mb-4">
						Share any thoughts about the workout, exercises you liked/disliked, or suggestions
					</Text>

					<TextInput
						value={notes}
						onChangeText={setNotes}
						placeholder="e.g., Loved the push-ups, but the squats were too easy..."
						multiline
						numberOfLines={4}
						className="border border-gray-300 rounded-xl p-4 text-gray-800 font-JakartaRegular"
						textAlignVertical="top"
					/>
				</View>

				{/* AI Learning Info */}
				<View className="p-6 bg-blue-50">
					<View className="flex-row items-center mb-3">
						<Ionicons name="bulb" size={24} color="#3B82F6" />
						<Text className="text-lg font-JakartaBold text-blue-800 ml-3">How This Helps</Text>
					</View>
					<Text className="text-blue-700 text-sm leading-5">
						Our AI uses your feedback to automatically adjust future workouts. If you found it too
						easy, we'll increase the intensity. If it was too hard, we'll scale it back. This
						ensures every workout is perfectly tailored to your progress.
					</Text>
				</View>
			</ScrollView>

			{/* Submit Button */}
			<View className="p-6 border-t border-gray-200">
				<TouchableOpacity
					onPress={submitFeedback}
					disabled={!difficulty || loading}
					className={`py-4 rounded-xl ${difficulty && !loading ? 'bg-green-500' : 'bg-gray-300'}`}
				>
					<Text
						className={`font-JakartaBold text-center text-lg ${
							difficulty && !loading ? 'text-white' : 'text-gray-500'
						}`}
					>
						{loading ? 'Submitting...' : 'Submit Feedback'}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
