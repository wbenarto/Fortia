import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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

const ActivityTracking = () => {
	const [nutritionGoals, setNutritionGoals] = useState<any>(null);
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

	// Fetch nutrition goals on component mount
	useEffect(() => {
		if (user?.id) {
			fetchNutritionGoals();
		}
	}, [user?.id]);

	// Refresh data when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchNutritionGoals();
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

	const storedBMR = getStoredBMR();

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
							{true ? (
								<View className="flex flex-row items-center bg-[#E3BBA11A] rounded-lg px-2 py-1">
									<Ionicons name="sparkles-outline" size={14} color="#E3BBA1" />
									<Text className="text-xs ml-1 text-[#E3BBA1]">Goal reached!</Text>
								</View>
							) : (
								<Text>{''}</Text>
							)}
						</View>

						<View className="flex flex-row items-end">
							<Text className="font-JakartaBold text-3xl">640</Text>
							<Text className="text-[#64748B]"> /600</Text>
						</View>
					</View>
					<View className="w-16 h-16 rounded-xl flex justify-center items-center bg-[#9ED5A0]">
						{true ? (
							<Ionicons name="checkmark-sharp" size={30} color="white" />
						) : (
							<Text className="text-xl text-white font-JakartaBold ">77%</Text>
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
						</View>
						<View className="flex flex-row justify-between items-center">
							<Text className="text-lg font-JakartaBold">
								7,234 <Text className="text-xs text-[#64748B]"> {'  '}/ 90g</Text>{' '}
							</Text>
							<View className="flex flex-row gap-2">
								<SimpleLineIcons name="fire" size={14} colors="#5A556B" />
								<Text className="text-[#64748B]">~350 cal</Text>
							</View>
						</View>
					</View>

					{/* Daily Calories Burned Card */}
					{nutritionGoals && (
						<View className=" h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<Ionicons name="flame-outline" size={14} color="#5A556B" />
								<Text className="text-xs text-[#64748B]">Daily Calories Burned</Text>
							</View>
							<View className="flex flex-row justify-between items-center">
								<Text className="text-lg font-JakartaBold">
									{isLoading ? '...' : storedBMR.toLocaleString()}
									<Text className="text-xs text-[#64748B]"> cal/day</Text>
								</Text>
								<View className="flex flex-row gap-2">
									<Ionicons name="information-circle-outline" size={14} color="#5A556B" />
									<Text className="text-[#64748B] text-xs">BMR only</Text>
								</View>
							</View>
						</View>
					)}

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
					onPress={() => console.log('im here')}
					textProp="text-lg ml-4"
					title="Start Workout"
				/>
			</View>
		</View>
	);
};

export default ActivityTracking;
