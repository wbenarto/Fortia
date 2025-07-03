import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import CustomButton from './CustomButton';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import {
	formatBMR,
	getActivityLevelDescription,
	calculateBMR,
	calculateTDEE,
} from '@/lib/bmrUtils';
import { getTodayStepData, requestHealthKitPermissions, getHealthKitStatus } from '@/lib/healthKit';

const ActivityTracking = () => {
	const [nutritionGoals, setNutritionGoals] = useState<any>(null);
	const [stepData, setStepData] = useState<any>(null);
	const [healthKitStatus, setHealthKitStatus] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { user } = useUser();

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

	// Fetch step data from backend
	const fetchStepDataFromBackend = async () => {
		if (!user?.id) return;
		try {
			const today = new Date();
			const dateStr = today.toISOString().split('T')[0];
			const response = await fetchAPI(`/(api)/steps?userId=${user.id}&date=${dateStr}`, {
				method: 'GET',
			});
			if (response.success && response.data && response.data.length > 0) {
				setStepData(response.data[0]);
			} else {
				setStepData(null);
			}
		} catch (error) {
			console.error('Failed to fetch step data from backend:', error);
		}
	};

	// On iPhone, fetch from device and upload to backend only if changed
	const fetchAndUploadDeviceSteps = async () => {
		if (!user?.id) return;
		try {
			const status = await getHealthKitStatus();
			setHealthKitStatus(status);

			if (status.isAvailable && status.isAuthorized) {
				let calorieParams = undefined;
				if (nutritionGoals) {
					calorieParams = {
						weight: Number(nutritionGoals.weight),
						height: Number(nutritionGoals.height),
						age: Number(nutritionGoals.age),
						gender: nutritionGoals.gender,
					};
				}
				const todayStepData = await getTodayStepData(10000, calorieParams);

				// Check if we need to update (only if step count changed)
				const currentBackendSteps = stepData?.steps || 0;
				if (todayStepData.steps !== currentBackendSteps) {
					// Upload to backend
					const today = new Date();
					const dateStr = today.toISOString().split('T')[0];
					await fetchAPI('/(api)/steps', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							userId: user.id,
							steps: todayStepData.steps,
							goal: todayStepData.goal,
							caloriesBurned: todayStepData.caloriesBurned,
							date: dateStr,
						}),
					});
				}
			}
		} catch (error) {
			console.error('Failed to fetch/upload device step data:', error);
		}
		// Always fetch from backend after potential upload
		await fetchStepDataFromBackend();
	};

	const requestHealthKitAccess = async () => {
		try {
			const status = await requestHealthKitPermissions();
			setHealthKitStatus(status);
			if (status.isAuthorized) {
				await fetchAndUploadDeviceSteps();
			}
		} catch (error) {
			console.error('Failed to request HealthKit permissions:', error);
		}
	};

	// Fetch nutrition goals and step data on component mount
	useEffect(() => {
		if (user?.id) {
			fetchNutritionGoals();
			if (Platform.OS === 'ios') {
				fetchAndUploadDeviceSteps();
			} else {
				fetchStepDataFromBackend();
			}
		}
	}, [user?.id]);

	// Refresh step data when nutrition goals change (for calorie calculation)
	useEffect(() => {
		if (user?.id && nutritionGoals) {
			if (Platform.OS === 'ios') {
				fetchAndUploadDeviceSteps();
			} else {
				fetchStepDataFromBackend();
			}
		}
	}, [nutritionGoals]);

	// Refresh data when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchNutritionGoals();
				if (Platform.OS === 'ios') {
					fetchAndUploadDeviceSteps();
				} else {
					fetchStepDataFromBackend();
				}
			}
		}, [user?.id])
	);

	// Get BMR from stored nutrition goals with fallback calculation
	const getStoredBMR = () => {
		if (!nutritionGoals) return 0;

		// Try to get BMR from database first
		const storedBMR = nutritionGoals.bmr;
		if (storedBMR && Number(storedBMR) > 0) {
			return Number(storedBMR);
		}

		// Fallback: calculate BMR if not stored
		if (
			nutritionGoals.weight &&
			nutritionGoals.height &&
			nutritionGoals.age &&
			nutritionGoals.gender
		) {
			return Math.round(
				calculateBMR(
					Number(nutritionGoals.weight),
					Number(nutritionGoals.height),
					Number(nutritionGoals.age),
					nutritionGoals.gender
				)
			);
		}

		return 0;
	};

	// Get TDEE from stored nutrition goals with fallback calculation
	const getStoredTDEE = () => {
		if (!nutritionGoals) return 0;

		// Try to get TDEE from database first
		const storedTDEE = nutritionGoals.tdee;
		if (storedTDEE && Number(storedTDEE) > 0) {
			return Number(storedTDEE);
		}

		// Fallback: calculate TDEE if not stored
		if (
			nutritionGoals.weight &&
			nutritionGoals.height &&
			nutritionGoals.age &&
			nutritionGoals.gender &&
			nutritionGoals.activity_level
		) {
			const bmr = calculateBMR(
				Number(nutritionGoals.weight),
				Number(nutritionGoals.height),
				Number(nutritionGoals.age),
				nutritionGoals.gender
			);
			return calculateTDEE(bmr, nutritionGoals.activity_level);
		}

		return 0;
	};

	const storedBMR = getStoredBMR();
	const storedTDEE = getStoredTDEE();

	// Calculate step calories with fallback
	const getStepCalories = () => {
		// First try to use stored calories from backend
		if (stepData?.calories_burned && stepData.calories_burned > 0) {
			return stepData.calories_burned;
		}

		// Fallback: calculate on frontend if we have user profile and steps
		if (stepData?.steps && nutritionGoals) {
			const { weight, height, gender } = nutritionGoals;
			if (weight && height && gender) {
				// Calculate stride length
				let strideLength;
				if (gender === 'male') {
					strideLength = (Number(height) * 0.415) / 100;
				} else {
					strideLength = (Number(height) * 0.413) / 100;
				}

				// Calculate distance and calories
				const distanceMeters = stepData.steps * strideLength;
				const distanceKm = distanceMeters / 1000;
				const caloriesPerKm = Number(weight) * 0.6;
				const calculatedCalories = Math.round(distanceKm * caloriesPerKm);

				return calculatedCalories;
			}
		}

		return 0;
	};

	const stepCalories = getStepCalories();
	const totalCaloriesBurned = storedBMR + stepCalories;

	return (
		<View className="w-full">
			<View className="flex flex-row justify-between items-center px-4">
				<Text className="font-JakartaSemiBold text-lg">Activity Summary</Text>
				<Text className="text-[#E3BBA1] text-xs font-JakartaSemiBold">5 Day Streak</Text>
			</View>
			<View className=" pb-6 px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-end ">
					<View>
						<View className="flex flex-row items-center gap-2 mb-2">
							<Text className=" text-[#64748B]">Calories Burned</Text>
							{totalCaloriesBurned >= storedTDEE && storedTDEE > 0 ? (
								<View className="flex flex-row items-center bg-[#E3BBA11A] rounded-lg px-2 py-1">
									<Ionicons name="sparkles-outline" size={14} color="#E3BBA1" />
									<Text className="text-xs ml-1 text-[#E3BBA1]">Goal reached!</Text>
								</View>
							) : (
								<Text>{''}</Text>
							)}
						</View>

						<View className="flex flex-row items-end">
							<Text className="font-JakartaBold text-3xl">
								{isLoading ? '...' : totalCaloriesBurned.toLocaleString()}
							</Text>
							<Text className="text-[#64748B]"> /{storedTDEE.toLocaleString()}</Text>
						</View>
					</View>
					<View className="w-16 h-16 rounded-xl flex justify-center items-center bg-[#9ED5A0]">
						{totalCaloriesBurned >= storedTDEE ? (
							<Ionicons name="checkmark-sharp" size={30} color="white" />
						) : (
							<Text className="text-xl text-white font-JakartaBold ">
								{storedTDEE > 0 ? Math.round((totalCaloriesBurned / storedTDEE) * 100) : 0}%
							</Text>
						)}
					</View>
				</View>
				<View className="flex gap-2 justify-between">
					{/* BMR Card - First on the list */}
					{nutritionGoals && (
						<View className="h-20 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<Ionicons name="heart-outline" size={14} color="#5A556B" />
								<Text className="text-xs text-[#64748B]">Basal Metabolic Rate</Text>
							</View>
							<View className="flex flex-row justify-between items-center">
								<Text className="text-lg font-JakartaBold">
									{isLoading
										? '...'
										: `${Math.round(Number(nutritionGoals.bmr || 0)).toLocaleString()} kcal/day`}
								</Text>
								<View className="flex flex-row gap-2">
									<Ionicons name="information-circle-outline" size={14} color="#5A556B" />
									<Text className="text-[#64748B] text-xs">At rest</Text>
								</View>
							</View>
						</View>
					)}

					<View className=" h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
						<View className="flex flex-row gap-2 mb-2 items-center">
							<Ionicons name="footsteps-outline" size={14} color="#5A556B" />
							<Text className="text-xs text-[#64748B]">Steps</Text>
							{!healthKitStatus?.isAuthorized && healthKitStatus?.isAvailable && (
								<TouchableOpacity
									onPress={requestHealthKitAccess}
									className="bg-[#E3BBA1] px-2 py-1 rounded-lg"
								>
									<Text className="text-white text-xs">Enable</Text>
								</TouchableOpacity>
							)}
						</View>
						<View className="flex flex-row justify-between items-center">
							<Text className="text-lg font-JakartaBold">
								{stepData ? (
									<>
										{stepData.steps.toLocaleString()}{' '}
										<Text className="text-xs text-[#64748B]">
											/ {stepData.goal.toLocaleString()}
										</Text>
									</>
								) : (
									<Text className="text-xs text-[#64748B]">Enable step tracking</Text>
								)}
							</Text>
							<View className="flex flex-row gap-2">
								<SimpleLineIcons name="fire" size={14} colors="#5A556B" />
								<Text className="text-[#64748B]">
									{stepCalories > 0 ? `${stepCalories} cal` : '--'}
								</Text>
							</View>
						</View>
					</View>

					<View className=" h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
						<View className="flex flex-row gap-2 mb-2 items-center">
							<Ionicons name="barbell-outline" size={14} color="#5A556B" />
							<Text className="text-xs text-[#64748B]">Today's Workout</Text>
						</View>
						<View className="flex flex-row justify-between items-center">
							<Text className="text-lg font-JakartaBold">Back & Biceps</Text>
							<View className="flex flex-row gap-2">
								<SimpleLineIcons name="fire" size={14} colors="#5A556B" />
								<Text className="text-[#64748B]">~350 cal</Text>
							</View>
						</View>
					</View>
				</View>

				<CustomButton
					IconLeft={() => <Ionicons name="barbell-outline" size={24} color="white" />}
					onPress={() => {}}
					textProp="text-lg ml-4"
					title="Start Workout"
				/>
			</View>
		</View>
	);
};

export default ActivityTracking;
