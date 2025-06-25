import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import CustomButton from './CustomButton';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';

interface MacroData {
	date: string;
	protein: number;
	carbs: number;
	fats: number;
}

interface MacrosTrackingProps {
	dailyGoal: {
		protein: number;
		carbs: number;
		fats: number;
	};
	currentIntake: {
		protein: number;
		carbs: number;
		fats: number;
	};
	weeklyData: MacroData[];
	onAddMeal: () => void;
}

const MacrosTracking: React.FC<MacrosTrackingProps> = ({
	dailyGoal,
	currentIntake,
	weeklyData,
	onAddMeal,
}) => {
	const [addMealModal, setAddMealModal] = useState(false);

	const handleAddMealModal = () => setAddMealModal(!addMealModal);

	return (
		<View className="w-full">
			<View className="flex flex-row justify-between items-center px-4">
				<Text className="font-JakartaSemiBold text-lg">Today's Nutrition</Text>
				<Text className="text-[#E3BBA1] text-xs font-JakartaSemiBold">On Track</Text>
			</View>
			<View className="px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-end ">
					<View>
						<Text className="mb-2 text-[#64748B]">Calories consumed</Text>
						<View className="flex flex-row items-end">
							<Text className="font-JakartaBold text-3xl">1,462</Text>
							<Text className="text-[#64748B]"> /2000</Text>
						</View>
					</View>
					<View className="w-16 h-16 rounded-xl flex justify-center items-center bg-[#E3BBA1]">
						<Text className="text-xl text-white font-JakartaBold ">73%</Text>
					</View>
				</View>
				<View className="flex flex-row justify-between">
					<View className="w-[32%] h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
						<View className="flex flex-row gap-2 mb-2 items-center">
							<View className="w-2 h-2 bg-blue-300 rounded-full"></View>
							<Text className="text-xs text-[#64748B]">Protein</Text>
						</View>
						<View>
							<Text>
								64g <Text className="text-xs text-[#64748B]"> {'  '}/ 90g</Text>{' '}
							</Text>
						</View>
					</View>
					<View className="w-[32%] h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
						<View className="flex flex-row gap-2 mb-2 items-center">
							<View className="w-2 h-2 bg-yellow-300 rounded-full"></View>
							<Text className="text-xs text-[#64748B]">Carbs</Text>
						</View>
						<View>
							<Text>
								187g <Text className="text-xs text-[#64748B]"> {'  '}/ 250g</Text>
							</Text>
						</View>
					</View>
					<View className="w-[32%] h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
						<View className="flex flex-row gap-2 mb-2 items-center">
							<View className="w-2 h-2 bg-red-300 rounded-full"></View>
							<Text className="text-xs text-[#64748B]">Fat</Text>
						</View>
						<View>
							<Text>
								42g <Text className="text-xs text-[#64748B]"> {'  '}/ 65g</Text>
							</Text>
						</View>
					</View>
				</View>

				<CustomButton onPress={handleAddMealModal} title="Log Meal" />

				<ReactNativeModal isVisible={addMealModal} onBackdropPress={() => setAddMealModal(false)}>
					<View className="bg-white py-6 px-4 rounded-md">
						<View className="flex flex-row justify-between items-center mb-6">
							<Text className="text-xl font-JakartaSemiBold">Log Your Meal</Text>
							<TouchableOpacity onPress={() => setAddMealModal(false)}>
								<Ionicons name="close" size={24} color="black" />
							</TouchableOpacity>
						</View>
						<View className="flex mx-auto w-full justify-center">
							<InputField
								label="Food Name"
								className="rounded-sm"
								labelClassName="text-xs text-black font-JakartaSemiBold"
								placeholder="e.g. Chicken Breast"
							/>
						</View>
						<View className="flex mx-auto w-full justify-center">
							<InputField
								label="Amount"
								className="rounded-sm"
								labelClassName="text-xs text-black font-JakartaSemiBold"
								placeholder="e.g. 100g or 1 cup"
							/>
						</View>

						<View className="flex justify-center items-center">
							<TouchableOpacity className="rounded-full bg-[#E3BBA1] w-20 h-20 p-4 my-8 flex justify-center items-center">
								<Ionicons name="mic" size={36} color="white" />
							</TouchableOpacity>
						</View>
					</View>
				</ReactNativeModal>
			</View>
		</View>
	);
};

export default MacrosTracking;
