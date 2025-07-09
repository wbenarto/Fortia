import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, Stack } from 'expo-router';
import ReactNativeModal from 'react-native-modal';
import GoalSetupModal from '../components/GoalSetupModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';
import { fetchAPI } from '../lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserDisplayName, getUserLastName, useUserProfile } from '@/lib/userUtils';
import InputField from '../components/InputField';
import CustomButton from '../components/CustomButton';

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

const AccountSettings = () => {
	const { user } = useUser();
	const { signOut } = useAuth();
	const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [goalSetupModal, setGoalSetupModal] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [deleteAccountModal, setDeleteAccountModal] = useState(false);
	const [privacyPolicyModal, setPrivacyPolicyModal] = useState(false);
	const [termsAndConditionsModal, setTermsAndConditionsModal] = useState(false);
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
			weight_loss: 'Weight Loss',
			weight_gain: 'Weight Gain',
			maintenance: 'Maintenance',
			muscle_gain: 'Muscle Gain',
		};
		return goals[goal as keyof typeof goals] || goal;
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	const formatDOB = (dob: string) => {
		const date = new Date(dob);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
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
		return Math.round(kg * 2.20462);
	};

	const convertCmToFeetInches = (cm: number): { feet: number; inches: number } => {
		const totalInches = cm / 2.54;
		const feet = Math.floor(totalInches / 12);
		const inches = Math.round(totalInches % 12);
		return { feet, inches };
	};

	if (isLoading) {
		return (
			<>
				<Stack.Screen options={{ headerShown: false }} />
				<View
					className="flex-1 bg-[#262135] justify-center items-center"
					style={{ paddingTop: insets.top }}
				>
					<ActivityIndicator size="large" color="#E3BBA1" />
					<Text className="text-white mt-4">Loading profile...</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1 bg-[#262135]" style={{ paddingTop: insets.top }}>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#E3BBA1" />
					</TouchableOpacity>
					<Text className="text-white text-lg font-JakartaSemiBold">Account Settings</Text>
					<View style={{ width: 24 }} />
				</View>

				<ScrollView className="flex-1 px-6 py-4">
					{/* Profile Section */}
					<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
						<View className="flex flex-row items-center mb-4">
							<View className="w-16 h-16 bg-[#E3BBA1] rounded-2xl flex justify-center items-center">
								<Text className="text-white text-xl font-JakartaSemiBold">
									{getUserDisplayName(userProfile)
										.split(' ')
										.map(n => n[0])
										.join('')
										.toUpperCase()}
								</Text>
							</View>
							<View className="ml-4 flex-1">
								<Text className="text-white text-lg font-JakartaSemiBold">
									{getUserDisplayName(userProfile)}
								</Text>
								<Text className="text-gray-400 text-sm">
									{user?.emailAddresses[0]?.emailAddress}
								</Text>
							</View>
						</View>
					</View>

					{/* Nutrition Goals Section */}
					<View className="mb-6">
						<Text className="text-white text-lg font-JakartaSemiBold mb-4">Nutrition Goals</Text>

						{!nutritionGoals ? (
							<View className="bg-[#2D2A3F] rounded-2xl p-6">
								<Text className="text-gray-400 text-center mb-4">
									No nutrition goals set. Set up your goals to get personalized recommendations.
								</Text>
								<CustomButton
									title="Set Up Goals"
									onPress={() => setGoalSetupModal(true)}
									className="bg-[#E3BBA1]"
								/>
							</View>
						) : (
							<View className="bg-[#2D2A3F] rounded-2xl p-6">
								<View className="flex flex-row justify-between items-center mb-4">
									<Text className="text-white font-JakartaSemiBold">Current Goals</Text>
									<TouchableOpacity onPress={() => setGoalSetupModal(true)}>
										<Ionicons name="pencil" size={20} color="#E3BBA1" />
									</TouchableOpacity>
								</View>

								<View className="space-y-3">
									<View className="flex flex-row justify-between">
										<Text className="text-gray-400">Age</Text>
										<Text className="text-white">
											{calculateCurrentAge(nutritionGoals.dob)} years
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-400">Weight</Text>
										<Text className="text-white">{convertKgToLbs(nutritionGoals.weight)} lbs</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-400">Height</Text>
										<Text className="text-white">
											{convertCmToFeetInches(nutritionGoals.height).feet}'{' '}
											{convertCmToFeetInches(nutritionGoals.height).inches}"
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-400">Target Weight</Text>
										<Text className="text-white">
											{convertKgToLbs(nutritionGoals.target_weight)} lbs
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-400">Activity Level</Text>
										<Text className="text-white">
											{getActivityLevelLabel(nutritionGoals.activity_level)}
										</Text>
									</View>
									<View className="flex flex-row justify-between">
										<Text className="text-gray-400">Fitness Goal</Text>
										<Text className="text-white">
											{getFitnessGoalLabel(nutritionGoals.fitness_goal)}
										</Text>
									</View>
								</View>

								<View className="mt-4 pt-4 border-t border-gray-700">
									<Text className="text-white font-JakartaSemiBold mb-3">Daily Targets</Text>
									<View className="space-y-2">
										<View className="flex flex-row justify-between">
											<Text className="text-gray-400">Calories</Text>
											<Text className="text-white">{nutritionGoals.daily_calories} kcal</Text>
										</View>
										<View className="flex flex-row justify-between">
											<Text className="text-gray-400">Protein</Text>
											<Text className="text-white">{nutritionGoals.daily_protein}g</Text>
										</View>
										<View className="flex flex-row justify-between">
											<Text className="text-gray-400">Carbs</Text>
											<Text className="text-white">{nutritionGoals.daily_carbs}g</Text>
										</View>
										<View className="flex flex-row justify-between">
											<Text className="text-gray-400">Fats</Text>
											<Text className="text-white">{nutritionGoals.daily_fats}g</Text>
										</View>
									</View>
								</View>
							</View>
						)}
					</View>

					{/* App Settings Section */}
					<View className="mb-6">
						<Text className="text-white text-lg font-JakartaSemiBold mb-4">App Settings</Text>
						<View className="space-y-3">
							<TouchableOpacity
								onPress={() => router.push('/help-support')}
								className="bg-[#2D2A3F] rounded-xl p-4 flex flex-row items-center"
							>
								<Ionicons name="help-circle-outline" size={24} color="#E3BBA1" />
								<View className="ml-4 flex-1">
									<Text className="text-white font-JakartaSemiBold">Help & Support</Text>
									<Text className="text-gray-400 text-sm">Get help and contact support</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="gray" />
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => setPrivacyPolicyModal(true)}
								className="bg-[#2D2A3F] rounded-xl p-4 flex flex-row items-center"
							>
								<Ionicons name="shield-outline" size={24} color="#E3BBA1" />
								<View className="ml-4 flex-1">
									<Text className="text-white font-JakartaSemiBold">Privacy Policy</Text>
									<Text className="text-gray-400 text-sm">Read our privacy policy</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="gray" />
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => setTermsAndConditionsModal(true)}
								className="bg-[#2D2A3F] rounded-xl p-4 flex flex-row items-center"
							>
								<Ionicons name="document-text-outline" size={24} color="#E3BBA1" />
								<View className="ml-4 flex-1">
									<Text className="text-white font-JakartaSemiBold">Terms & Conditions</Text>
									<Text className="text-gray-400 text-sm">Read our terms of service</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="gray" />
							</TouchableOpacity>
						</View>
					</View>

					{/* Account Actions Section */}
					<View className="mb-6">
						<Text className="text-white text-lg font-JakartaSemiBold mb-4">Account Actions</Text>
						<View className="space-y-3">
							<TouchableOpacity
								onPress={handleSignOut}
								className="bg-[#2D2A3F] rounded-xl p-4 flex flex-row items-center"
							>
								<Ionicons name="log-out-outline" size={24} color="#E3BBA1" />
								<View className="ml-4 flex-1">
									<Text className="text-white font-JakartaSemiBold">Sign Out</Text>
									<Text className="text-gray-400 text-sm">Sign out of your account</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="gray" />
							</TouchableOpacity>

							<TouchableOpacity
								onPress={handleDeleteAccount}
								className="bg-red-500/20 rounded-xl p-4 flex flex-row items-center border border-red-500/30"
							>
								<Ionicons name="trash-outline" size={24} color="#ef4444" />
								<View className="ml-4 flex-1">
									<Text className="text-red-400 font-JakartaSemiBold">Delete Account</Text>
									<Text className="text-red-400/70 text-sm">Permanently delete your account</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="#ef4444" />
							</TouchableOpacity>
						</View>
					</View>
				</ScrollView>

				{/* Modals */}
				<GoalSetupModal
					isVisible={goalSetupModal}
					onClose={() => setGoalSetupModal(false)}
					onGoalsSet={handleGoalsUpdated}
				/>

				<PrivacyPolicyModal
					isVisible={privacyPolicyModal}
					onClose={() => setPrivacyPolicyModal(false)}
				/>

				<TermsAndConditionsModal
					isVisible={termsAndConditionsModal}
					onClose={() => setTermsAndConditionsModal(false)}
				/>

				{/* Delete Account Modal */}
				<ReactNativeModal
					isVisible={deleteAccountModal}
					onBackdropPress={closeDeleteModal}
					onBackButtonPress={closeDeleteModal}
					animationIn="slideInUp"
					animationOut="slideOutDown"
					className="m-0 justify-end"
				>
					<View className="bg-[#2D2A3F] rounded-t-3xl p-6">
						<View className="flex items-center mb-6">
							<View className="w-16 h-16 bg-red-500/20 rounded-full flex justify-center items-center mb-4">
								<Ionicons name="warning" size={32} color="#ef4444" />
							</View>
							<Text className="text-white text-xl font-JakartaSemiBold text-center mb-2">
								Delete Account
							</Text>
							<Text className="text-gray-400 text-center leading-6">
								This action cannot be undone. All your data will be permanently deleted.
							</Text>
						</View>

						<View className="mb-6">
							<Text className="text-white font-JakartaSemiBold mb-2">
								Enter your password to confirm:
							</Text>
							<InputField
								placeholder="Password"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
								error={passwordError}
							/>
						</View>

						<View className="flex flex-row space-x-3">
							<TouchableOpacity
								onPress={closeDeleteModal}
								className="flex-1 bg-gray-600 rounded-xl py-4"
							>
								<Text className="text-white text-center font-JakartaSemiBold">Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handlePasswordValidation}
								disabled={isValidating}
								className="flex-1 bg-red-500 rounded-xl py-4"
							>
								{isValidating ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text className="text-white text-center font-JakartaSemiBold">
										Delete Account
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</ReactNativeModal>
			</View>
		</>
	);
};

export default AccountSettings;
