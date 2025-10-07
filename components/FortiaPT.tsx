import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfile } from '@/lib/userUtils';
import { fetchAPI } from '@/lib/fetch';

interface FortiaPTProps {
	isVisible: boolean;
	onClose: () => void;
}

const FortiaPT: React.FC<FortiaPTProps> = ({ isVisible, onClose }) => {
	const userProfile = useUserProfile();
	const [nutritionGoals, setNutritionGoals] = useState<any>(null);

	// Fetch nutrition goals when modal opens
	useEffect(() => {
		if (isVisible && userProfile.id) {
			fetchNutritionGoals();
		}
	}, [isVisible, userProfile.id]);

	const fetchNutritionGoals = async () => {
		try {
			const response = await fetchAPI(`/api/user?clerkId=${userProfile.id}`, {
				method: 'GET',
			});
			console.log(response);
			if (response.success && response.data) {
				setNutritionGoals(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch nutrition goals:', error);
		}
	};

	const handleClose = () => {
		onClose();
	};

	// Get fitness goal display text
	const getFitnessGoalText = (goal: string) => {
		switch (goal) {
			case 'lose_weight':
				return 'lose weight';
			case 'gain_muscle':
				return 'gain muscle';
			case 'improve_fitness':
				return 'improve fitness';
			case 'maintain':
				return 'maintain current weight';
			default:
				return 'achieve your fitness goals';
		}
	};

	// Get calorie strategy message
	const getCalorieStrategyMessage = (goal: string) => {
		switch (goal) {
			case 'lose_weight':
				return "We're creating a calorie deficit to help you lose weight safely and sustainably.";
			case 'gain_muscle':
				return "We're providing a calorie surplus to support muscle growth and recovery.";
			case 'improve_fitness':
				return "We're maintaining a slight deficit to help you improve body composition.";
			case 'maintain':
				return "We're maintaining your current weight with balanced calorie intake.";
			default:
				return "We're optimizing your calorie intake for your fitness goals.";
		}
	};

	// Calculate weight difference
	const getWeightDifference = () => {
		if (!userProfile.weight || !userProfile.targetWeight) return null;
		const difference = nutritionGoals.weight - nutritionGoals.target_weight;
		return {
			amount: Math.abs(difference).toFixed(1),
			direction: difference > 0 ? 'lose' : 'gain',
		};
	};

	const weightDiff = getWeightDifference();

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={handleClose}
			onBackButtonPress={handleClose}
			className="m-0 w-full my-20 mx-auto bg-white rounded-lg"
			animationIn="slideInUp"
			animationOut="slideOutDown"
		>
			<ScrollView className="bg-white w-full h-full pt-10 px-6 rounded-xl">
				{/* Header */}
				<View className="mb-6">
					<Text className="font-JakartaSemiBold text-3xl text-[#E3BBA1] mb-2 pb-2 border-b-[3px] border-[#E3BBA1]">
						Your Personal Trainer
					</Text>
					<Text className="text-gray-600 text-lg">
						Hey <Text className="font-JakartaBold">{userProfile.username || 'there'}</Text>! Here's
						your personalized plan for today.
					</Text>
				</View>

				{/* Current Status */}
				<View className=" p-2 rounded-xl mb-2">
					<Text className="font-JakartaSemiBold text-xl mb-3 text-gray-800">
						<Ionicons name="podium-outline" size={24} color={'green'} />
						{'  '} Your Current Status
					</Text>
					<View className="space-y-2">
						<Text className="text-gray-700">
							<Text className="font-JakartaSemiBold">Current Weight:</Text>{' '}
							{nutritionGoals && nutritionGoals.weight} lbs
						</Text>
						<Text className="text-gray-700">
							<Text className="font-JakartaSemiBold">Target Weight:</Text>{' '}
							{nutritionGoals && nutritionGoals.target_weight} lbs
						</Text>
						{weightDiff && (
							<Text className="text-gray-700">
								<Text className="font-JakartaSemiBold">Goal:</Text> {weightDiff.direction}{' '}
								{weightDiff.amount} lbs
							</Text>
						)}
						<Text className="text-gray-700">
							<Text className="font-JakartaSemiBold">Fitness Goal:</Text>{' '}
							{getFitnessGoalText(userProfile.fitnessGoal || '')}
						</Text>
					</View>
				</View>

				<View className="flex flex-row px-4 py-4 mb-2 justify-center items-center">
					<Ionicons name="sparkles-outline" size={20} color="green" />
					<Text className="text-green-900 text-center px-2 text-lg rounded-lg leading-6">
						{getCalorieStrategyMessage(userProfile.fitnessGoal || '')}
					</Text>
					<Ionicons name="sparkles-outline" size={20} color="green" />
				</View>

				{/* Daily Macro Targets */}
				{nutritionGoals && (
					<View className="p-4 bg-orange-100 rounded-xl mb-6">
						<Text className="font-JakartaSemiBold text-center text-xl mb-3 text-black">
							Today's Macro Targets
						</Text>
						<View className="flex flex-row space-x-4 justify-between items-end">
							<View className="justify-center items-center">
								<Text className="text-2xl font-JakartaSemiBold">
									{' '}
									{nutritionGoals.daily_calories || '--'}{' '}
								</Text>
								<Text className="font-JakartaLight">Daily Calories</Text>{' '}
							</View>
							<View className="items-center">
								<Text className="font-JakartaSemiBold text-lg">
									{Math.round(nutritionGoals.daily_protein || 0)}
								</Text>
								<Text className="font-JakartaLight">Protein</Text>{' '}
							</View>
							<View className="items-center">
								<Text className="font-JakartaSemiBold text-lg">
									{Math.round(nutritionGoals.daily_carbs || 0)}
								</Text>
								<Text className="font-JakartaLight">Carbs</Text>{' '}
							</View>
							<View className="items-center">
								<Text className="font-JakartaSemiBold text-lg">
									{Math.round(nutritionGoals.daily_fats || 0)}
								</Text>
								<Text className="font-JakartaLight">Fats</Text>
							</View>
						</View>
					</View>
				)}

				{/* Daily Quest Reminder */}
				<View className="bg-white p-2 rounded-xl mb-6">
					<Text className="font-JakartaSemiBold text-xl mb-3 text-green-800">
						<Ionicons name="color-filter-outline" size={20} /> {'  '} Daily Quest Reminder
					</Text>
					<Text className="text-black leading-6 mb-3">
						Consistency is key! Make sure to log your daily quests:
					</Text>
					<View className="space-y-2">
						<Text className="text-green-700">
							• <Text className="font-JakartaSemiBold">Weight:</Text> Track your progress
						</Text>
						<Text className="text-green-700">
							• <Text className="font-JakartaSemiBold">Meals:</Text> Log your nutrition
						</Text>
						<Text className="text-green-700">
							• <Text className="font-JakartaSemiBold">Exercise:</Text> Record your activities
						</Text>
					</View>
				</View>

				{/* Motivational Message */}
				<View className="bg-white p-2 rounded-xl mb-6">
					<Text className="font-JakartaSemiBold text-xl mb-3 text-black">
						<Ionicons name="trophy-outline" size={20} /> {'  '} Keep Going!
					</Text>
					<Text className="text-black leading-6">
						Every day you log your quests is a step closer to your goals. You've got this,{' '}
						{userProfile.username || 'champion'}!
					</Text>
				</View>
			</ScrollView>

			{/* Close Button */}
			<TouchableOpacity className="absolute z-10 top-0 right-0 mr-4 mt-10" onPress={handleClose}>
				<Ionicons name="close-outline" size={24} color="#666" />
			</TouchableOpacity>
		</ReactNativeModal>
	);
};

export default FortiaPT;
