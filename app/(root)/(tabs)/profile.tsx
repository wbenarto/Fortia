import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import GoalSetupModal from '../../../components/GoalSetupModal';
import { fetchAPI } from '../../../lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NutritionGoals {
	id: string;
	userId: string;
	dob: string;
	age: number;
	weight: number;
	targetWeight: number;
	height: number;
	gender: string;
	activityLevel: string;
	fitnessGoal: string;
	daily_calories: number;
	daily_protein: number;
	daily_carbs: number;
	daily_fats: number;
	bmr: number;
	tdee: number;
	createdAt: string;
	updatedAt: string;
}

const Profile = () => {
	const { user } = useUser();
	const { signOut } = useAuth();
	const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [goalSetupModal, setGoalSetupModal] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const insets = useSafeAreaInsets();
	useEffect(() => {
		if (user?.id) {
			fetchNutritionGoals();
		}
	}, [user?.id]);

	const fetchNutritionGoals = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		try {
			const response = await fetchAPI(`/(api)/nutrition-goals?userId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				setNutritionGoals(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch nutrition goals:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoalsUpdated = () => {
		fetchNutritionGoals();
		setGoalSetupModal(false);
	};

	const handleDeleteGoals = () => {
		Alert.alert(
			'Delete Nutrition Goals',
			'Are you sure you want to delete your nutrition goals? This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						if (!user?.id || !nutritionGoals?.id) return;

						try {
							const response = await fetchAPI(`/(api)/nutrition-goals`, {
								method: 'DELETE',
								body: JSON.stringify({
									userId: user.id,
									goalId: nutritionGoals.id,
								}),
							});

							if (response.success) {
								setNutritionGoals(null);
								Alert.alert('Success', 'Nutrition goals deleted successfully.');
							} else {
								Alert.alert('Error', response.error || 'Failed to delete goals');
							}
						} catch (error) {
							Alert.alert('Error', 'Failed to delete nutrition goals');
							console.error('Delete goals error:', error);
						}
					},
				},
			]
		);
	};

	const handleSignOut = () => {
		signOut();
		router.replace('/(auth)/sign-in');
	};

	const getActivityLevelLabel = (level: string) => {
		const levels = {
			sedentary: 'Sedentary',
			light: 'Lightly Active',
			moderate: 'Moderately Active',
			active: 'Very Active',
			very_active: 'Extremely Active',
		};
		return levels[level as keyof typeof levels] || level;
	};

	const getFitnessGoalLabel = (goal: string) => {
		const goals = {
			lose_weight: 'Lose Weight',
			gain_muscle: 'Gain Muscle',
			maintain: 'Maintain Weight',
			improve_fitness: 'Improve Fitness',
		};
		return goals[goal as keyof typeof goals] || goal;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const formatDOB = (dob: string) => {
		return new Date(dob).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const calculateCurrentAge = (dob: string) => {
		const birthDate = new Date(dob);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}

		return age;
	};

	const convertKgToLbs = (kg: number): number => {
		return kg * 2.20462;
	};

	const convertCmToFeetInches = (cm: number): { feet: number; inches: number } => {
		const totalInches = cm / 2.54;
		const feet = Math.floor(totalInches / 12);
		const inches = Math.round(totalInches % 12);
		return { feet, inches };
	};

	if (isLoading) {
		return (
			<View className="flex-1 bg-[#262135] justify-center items-center">
				<ActivityIndicator size="large" color="#E3BBA1" />
				<Text className="text-white mt-4 text-lg">Loading your information...</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-[#262135]" style={{ paddingTop: insets.top }}>
			{/* Header */}
			<View className="flex flex-row items-center justify-between px-4 py-6 bg-[#2D2A3F]">
				<View className="w-6" />
				<Text className="text-white text-xl font-JakartaSemiBold">Account Settings</Text>
				<View className="w-6" />
			</View>

			<ScrollView className="flex-1 px-4 py-6">
				{/* Profile Section */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<View className="flex flex-row items-center mb-4">
						<View className="w-16 h-16 bg-[#E3BBA1] rounded-full flex items-center justify-center mr-4">
							<Ionicons name="person" size={32} color="white" />
						</View>
						<View className="flex-1">
							<Text className="text-white text-lg font-JakartaSemiBold">
								{user?.firstName} {user?.lastName}
							</Text>
							<Text className="text-gray-400 text-sm">{user?.emailAddresses[0]?.emailAddress}</Text>
						</View>
					</View>
				</View>

				{/* Nutrition Goals Section */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<View className="flex flex-row items-center justify-between mb-4">
						<Text className="text-white text-lg font-JakartaSemiBold">Nutrition Goals</Text>
						<TouchableOpacity
							onPress={() => setGoalSetupModal(true)}
							className="bg-[#E3BBA1] px-4 py-2 rounded-full"
						>
							<Text className="text-white text-sm font-JakartaSemiBold">
								{nutritionGoals ? 'Update Goals' : 'Set Goals'}
							</Text>
						</TouchableOpacity>
					</View>

					{nutritionGoals ? (
						<View>
							{/* Personal Information */}
							<View className="mb-6">
								<Text className="text-gray-400 text-sm font-JakartaSemiBold mb-3">
									Personal Information
								</Text>
								<View className="bg-[#262135] rounded-xl p-4">
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Date of Birth</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.dob ? formatDOB(nutritionGoals.dob) : 'Not set'}
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Current Age</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.dob
												? `${calculateCurrentAge(nutritionGoals.dob)} years`
												: 'Not set'}
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Weight</Text>
										<Text className="text-white font-JakartaSemiBold">
											{convertKgToLbs(nutritionGoals.weight).toFixed(1)} lbs (
											{nutritionGoals.weight} kg)
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Target Weight</Text>
										<Text className="text-white font-JakartaSemiBold">
											{convertKgToLbs(nutritionGoals.targetWeight).toFixed(1)} lbs (
											{nutritionGoals.targetWeight} kg)
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Height</Text>
										<Text className="text-white font-JakartaSemiBold">
											{(() => {
												const { feet, inches } = convertCmToFeetInches(nutritionGoals.height);
												return `${feet}'${inches}" (${nutritionGoals.height} cm)`;
											})()}
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-300">Gender</Text>
										<Text className="text-white font-JakartaSemiBold capitalize">
											{nutritionGoals.gender}
										</Text>
									</View>
								</View>
							</View>

							{/* Activity & Goals */}
							<View className="mb-6">
								<Text className="text-gray-400 text-sm font-JakartaSemiBold mb-3">
									Activity & Goals
								</Text>
								<View className="bg-[#262135] rounded-xl p-4">
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Activity Level</Text>
										<Text className="text-white font-JakartaSemiBold">
											{getActivityLevelLabel(nutritionGoals.activityLevel)}
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-300">Fitness Goal</Text>
										<Text className="text-white font-JakartaSemiBold">
											{getFitnessGoalLabel(nutritionGoals.fitnessGoal)}
										</Text>
									</View>
								</View>
							</View>

							{/* Daily Targets */}
							<View className="mb-6">
								<Text className="text-gray-400 text-sm font-JakartaSemiBold mb-3">
									Daily Targets
								</Text>
								<View className="bg-[#262135] rounded-xl p-4">
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Calories</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.daily_calories} kcal
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Protein</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.daily_protein}g
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Carbs</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.daily_carbs}g
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-300">Fats</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.daily_fats}g
										</Text>
									</View>
								</View>
							</View>

							{/* Calculations */}
							<View className="mb-6">
								<Text className="text-gray-400 text-sm font-JakartaSemiBold mb-3">
									Calculations
								</Text>
								<View className="bg-[#262135] rounded-xl p-4">
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">BMR (Basal Metabolic Rate)</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.bmr} kcal
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-300">TDEE (Total Daily Energy Expenditure)</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.tdee} kcal
										</Text>
									</View>
								</View>
							</View>

							{/* Last Updated */}
							<View className="mb-4">
								<Text className="text-gray-400 text-xs text-center">
									Last updated: {formatDate(nutritionGoals.updatedAt)}
								</Text>
							</View>

							{/* Delete Button */}
							<TouchableOpacity
								onPress={handleDeleteGoals}
								className="bg-red-600 py-3 rounded-xl flex items-center justify-center"
							>
								<Text className="text-white font-JakartaSemiBold">Delete Nutrition Goals</Text>
							</TouchableOpacity>
						</View>
					) : (
						<View className="bg-[#262135] rounded-xl p-6">
							<View className="flex items-center">
								<Ionicons name="fitness-outline" size={48} color="#E3BBA1" />
								<Text className="text-white text-lg font-JakartaSemiBold mt-4 mb-2">
									No Nutrition Goals Set
								</Text>
								<Text className="text-gray-400 text-center mb-4">
									Set up your personalized nutrition goals to track your progress and achieve your
									fitness objectives.
								</Text>
								<TouchableOpacity
									onPress={() => setGoalSetupModal(true)}
									className="bg-[#E3BBA1] px-6 py-3 rounded-xl"
								>
									<Text className="text-white font-JakartaSemiBold">Set Up Goals</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>

				{/* App Settings Section */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-4">App Settings</Text>

					<TouchableOpacity className="flex flex-row items-center justify-between py-3 border-b border-gray-700">
						<View className="flex flex-row items-center">
							<Ionicons name="notifications-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Notifications</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>

					<TouchableOpacity className="flex flex-row items-center justify-between py-3 border-b border-gray-700">
						<View className="flex flex-row items-center">
							<Ionicons name="shield-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Privacy & Security</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>

					<TouchableOpacity className="flex flex-row items-center justify-between py-3">
						<View className="flex flex-row items-center">
							<Ionicons name="help-circle-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Help & Support</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>
				</View>

				{/* Account Actions */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-4">Account</Text>

					<TouchableOpacity className="flex flex-row items-center justify-between py-3 border-b border-gray-700">
						<View className="flex flex-row items-center">
							<Ionicons name="person-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Edit Profile</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>

					<TouchableOpacity
						onPress={handleSignOut}
						className="flex flex-row items-center justify-between py-3"
					>
						<View className="flex flex-row items-center">
							<Ionicons name="log-out-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Sign Out</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Goal Setup Modal */}
			<GoalSetupModal
				isVisible={goalSetupModal}
				onClose={() => setGoalSetupModal(false)}
				onGoalsSet={handleGoalsUpdated}
			/>
		</View>
	);
};

export default Profile;
