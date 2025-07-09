import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import ReactNativeModal from 'react-native-modal';
import GoalSetupModal from '../../../components/GoalSetupModal';
import PrivacyPolicyModal from '../../../components/PrivacyPolicyModal';
import { fetchAPI } from '../../../lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserDisplayName, getUserLastName, useUserProfile } from '@/lib/userUtils';
import InputField from '../../../components/InputField';
import CustomButton from '../../../components/CustomButton';

interface NutritionGoals {
	id: string;
	userId: string;
	dob: string;
	age: number;
	weight: number;
	target_weight: number;
	height: number;
	gender: string;
	activity_level: string;
	fitness_goal: string;
	daily_calories: number;
	daily_protein: number;
	daily_carbs: number;
	daily_fats: number;
	bmr: number;
	tdee: number;
	created_at: string;
	updated_at: string;
}

const Profile = () => {
	const { user } = useUser();
	const { signOut } = useAuth();
	const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [goalSetupModal, setGoalSetupModal] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [deleteAccountModal, setDeleteAccountModal] = useState(false);
	const [privacyPolicyModal, setPrivacyPolicyModal] = useState(false);
	const [password, setPassword] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	const [passwordError, setPasswordError] = useState('');
	const insets = useSafeAreaInsets();
	useEffect(() => {
		if (user?.id) {
			fetchNutritionGoals();
		}
	}, [user?.id]);

	// Refresh data when page comes into focus (e.g., after editing profile)
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchNutritionGoals();
			}
		}, [user?.id])
	);

	const userProfile = useUserProfile();

	const fetchNutritionGoals = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		try {
			const response = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
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
			'Reset Nutrition Goals',
			'Are you sure you want to reset your nutrition goals? This will clear your fitness goals and calculated macros.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Reset',
					style: 'destructive',
					onPress: async () => {
						if (!user?.id) return;

						try {
							// Reset nutrition goals by updating user with null values
							const response = await fetchAPI(`/(api)/user`, {
								method: 'PUT',
								body: JSON.stringify({
									clerkId: user.id,
									// Preserve basic user info but clear nutrition goals
									dob: nutritionGoals?.dob,
									age: nutritionGoals?.age,
									weight: nutritionGoals?.weight,
									startingWeight: nutritionGoals?.weight, // Use current weight as starting weight
									height: nutritionGoals?.height,
									gender: nutritionGoals?.gender,
									// Clear nutrition goals
									targetWeight: null,
									activityLevel: null,
									fitnessGoal: null,
									dailyCalories: null,
									dailyProtein: null,
									dailyCarbs: null,
									dailyFats: null,
									bmr: null,
									tdee: null,
								}),
							});

							if (response.success) {
								setNutritionGoals(null);
								Alert.alert('Success', 'Nutrition goals reset successfully.');
							} else {
								Alert.alert('Error', response.error || 'Failed to reset goals');
							}
						} catch (error) {
							Alert.alert('Error', 'Failed to reset nutrition goals');
							console.error('Reset goals error:', error);
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

	const handleDeleteAccount = () => {
		setDeleteAccountModal(true);
	};

	const handlePasswordValidation = async () => {
		if (!password.trim()) {
			Alert.alert('Error', 'Please enter your password to continue.');
			return;
		}

		setIsValidating(true);
		setPasswordError(''); // Clear any previous error

		try {
			// For demo purposes, let's assume the correct password is "password123"
			// In a real app, you would validate against the user's actual password
			const correctPassword = 'password123';

			if (password === correctPassword) {
				console.log('hooray');
				Alert.alert('Success', 'Password is correct! Account deletion would proceed here.');
				closeDeleteModal();
			} else {
				setPasswordError('Password is not correct. Please try again.');
				setPassword(''); // Clear the password field
			}
		} catch (error) {
			setPasswordError('Failed to validate password. Please try again.');
		} finally {
			setIsValidating(false);
		}
	};

	const closeDeleteModal = () => {
		setDeleteAccountModal(false);
		setPassword('');
		setIsValidating(false);
		setPasswordError('');
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
		<View className="flex-1 bg-[#262135] pb-20" style={{ paddingTop: insets.top }}>
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
								{getUserDisplayName(userProfile)} {getUserLastName(userProfile)}
							</Text>
							<Text className="text-gray-400 text-sm">{user?.emailAddresses[0]?.emailAddress}</Text>
						</View>
					</View>
				</View>
				{/* Account Actions */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-4">Account</Text>

					<TouchableOpacity
						onPress={() => router.push('/edit-profile')}
						className="flex flex-row items-center justify-between py-3 border-b border-gray-700"
					>
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
							<Ionicons name="help-circle-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Help & Support</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => setPrivacyPolicyModal(true)}
						className="flex flex-row items-center justify-between py-3 border-b border-gray-700"
					>
						<View className="flex flex-row items-center">
							<Ionicons name="shield-checkmark-outline" size={24} color="#E3BBA1" />
							<Text className="text-white ml-3">Privacy Policy</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="gray" />
					</TouchableOpacity>
				</View>

				{/* Nutrition Goals Section */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					{nutritionGoals ? (
						<View>
							{/* Personal Information */}
							<View className="mb-6">
								<Text className="text-white text-lg font-JakartaSemiBold mb-4">
									Account Information
								</Text>
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
												? `${calculateCurrentAge(nutritionGoals.dob)}`
												: 'Not set'}
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Weight</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.weight} lbs
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Target Weight</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.target_weight} lbs
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
											{getActivityLevelLabel(nutritionGoals.activity_level)}
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-300">Fitness Goal</Text>
										<Text className="text-white font-JakartaSemiBold">
											{getFitnessGoalLabel(nutritionGoals.fitness_goal)}
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
											{Math.round(nutritionGoals.daily_calories)} kcal
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Protein</Text>
										<Text className="text-white font-JakartaSemiBold">
											{Math.round(nutritionGoals.daily_protein)}g
										</Text>
									</View>
									<View className="flex flex-row justify-between mb-2">
										<Text className="text-gray-300">Carbs</Text>
										<Text className="text-white font-JakartaSemiBold">
											{Math.round(nutritionGoals.daily_carbs)}g
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-300">Fats</Text>
										<Text className="text-white font-JakartaSemiBold">
											{Math.round(nutritionGoals.daily_fats)}g
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
									<View className="flex flex-row items-center justify-between mb-2">
										<Text className="text-gray-300">
											BMR{' '}
											<Text className="text-xs text-gray-500">
												{'\n'}
												(Basal Metabolic Rate)
											</Text>
										</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.bmr} kcal
										</Text>
									</View>
									<View className="flex flex-row  items-center justify-between">
										<Text className="text-gray-300">
											TDEE {'\n'}
											<Text className="text-xs text-gray-500">
												(Total Daily Energy Expenditure)
											</Text>
										</Text>
										<Text className="text-white font-JakartaSemiBold">
											{nutritionGoals.tdee} kcal
										</Text>
									</View>
								</View>
							</View>

							{/* Last Updated */}
							<View className="mb-4">
								<Text className="text-gray-400 text-xs text-center">
									Last updated: {formatDate(nutritionGoals.updated_at)}
								</Text>
							</View>
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
				<TouchableOpacity
					onPress={handleDeleteAccount}
					className="flex flex-row items-center justify-between py-4 px-4 bg-red-600/20 rounded-xl border border-red-500/30"
				>
					<View className="flex flex-row items-center">
						<Ionicons name="trash-outline" size={24} color="#ef4444" />
						<Text className="text-white ml-3 font-JakartaSemiBold">Delete Account</Text>
					</View>
					<Ionicons name="chevron-forward" size={20} color="white" />
				</TouchableOpacity>
			</ScrollView>

			{/* Goal Setup Modal */}
			<GoalSetupModal
				isVisible={goalSetupModal}
				onClose={() => setGoalSetupModal(false)}
				onGoalsSet={handleGoalsUpdated}
			/>

			{/* Delete Account Modal */}
			<ReactNativeModal isVisible={deleteAccountModal} onBackdropPress={closeDeleteModal}>
				<View className="bg-white py-14 px-4 mx-0 rounded-md">
					<View className="pb-4">
						<Text className="text-xl text-center font-JakartaSemiBold">Delete Account</Text>
					</View>

					<View className="mb-6">
						<Text className="text-gray-600 text-center text-sm leading-5">
							Are you absolutely sure you want to delete your account? This action cannot be undone
							and all your information, including your nutrition goals, weight tracking, and meal
							data will be permanently deleted.
						</Text>
					</View>

					<View className="mb-8">
						<InputField
							label="Password"
							placeholder="Enter your password to confirm"
							secureTextEntry
							value={password}
							onChangeText={setPassword}
						/>
						{passwordError ? (
							<Text className="text-red-500 text-sm mt-2 text-center">{passwordError}</Text>
						) : null}
					</View>

					<View className="flex flex-row space-x-3">
						<TouchableOpacity
							onPress={closeDeleteModal}
							className="flex-1 py-3 px-4 border border-gray-300 rounded-lg"
						>
							<Text className="text-gray-700 text-center font-JakartaSemiBold">Cancel</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handlePasswordValidation}
							disabled={isValidating}
							className="flex-1 py-3 px-4 bg-red-600 rounded-lg"
						>
							<Text className="text-white text-center font-JakartaSemiBold">
								{isValidating ? 'Validating...' : 'Delete Account'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ReactNativeModal>

			{/* Privacy Policy Modal */}
			<PrivacyPolicyModal
				isVisible={privacyPolicyModal}
				onClose={() => setPrivacyPolicyModal(false)}
			/>
		</View>
	);
};

export default Profile;
