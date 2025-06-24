import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import CustomButton from './CustomButton';

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

const MacroProgressBar = ({
	current,
	goal,
	color,
	label,
}: {
	current: number;
	goal: number;
	color: string;
	label: string;
}) => {
	const percentage = Math.min((current / goal) * 100, 100);

	return (
		<View className="mb-4">
			<View className="flex-row justify-between mb-1">
				<Text className="text-black font-JakartaSemiBold">{label}</Text>
				<Text className="text-black font-JakartaSemiBold">
					{current}g / {goal}g
				</Text>
			</View>
			<View className="h-2 bg-neutral-700 rounded-full overflow-hidden">
				<View className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
			</View>
		</View>
	);
};

const MacrosTracking: React.FC<MacrosTrackingProps> = ({
	dailyGoal,
	currentIntake,
	weeklyData,
	onAddMeal,
}) => {
	const chartData = weeklyData.map((data, index) => ({
		value: data.protein + data.carbs + data.fats,
		dataPointText: `${data.protein + data.carbs + data.fats}g`,
		label: data.date,
	}));

	return (
		<View className="w-full">
			<View className="flex flex-row justify-between px-4">
				<Text className="font-JakartaSemiBold text-lg">Today's Nutrition</Text>
				<Text className="text-[#E3BBA1] text-xs font-JakartaSemiBold">On Track</Text>
			</View>
			<View className=" pb-6 px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-end ">
					<View>
						<Text className="mb-2 text-[#64748B]">Calories consumed</Text>
						<View className="flex flex-row items-end">
							<Text className="font-JakartaBold text-3xl">1,462</Text>
							<Text className="text-[#64748B]"> /2000</Text>
						</View>
					</View>
					<View className="w-16 h-16 rounded-xl flex justify-center items-center bg-[#E3BBA1]">
						{' '}
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
								187g <Text className="text-xs text-[#64748B]"> {'  '}/ 250g</Text>{' '}
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
								42g <Text className="text-xs text-[#64748B]"> {'  '}/ 65g</Text>{' '}
							</Text>
						</View>
					</View>
				</View>

				<CustomButton onPress={() => console.log('im here')} title="Log Meal" />
			</View>
		</View>

		// Prev version
		// <ScrollView className="flex-1 px-8 ">
		//   <View className="">
		//     {/* Header */}

		//     {/* Daily Progress */}
		//     <View className="bg-white p-4 rounded-2xl mb-6">

		//       <View className="flex-row justify-between items-center mb-6">
		//         <Text className="text-xl font-JakartaBold text-black ">Today's Nutrition</Text>

		//       </View>

		//       <MacroProgressBar
		//         current={currentIntake.protein}
		//         goal={dailyGoal.protein}
		//         color="bg-[#C4E1E6]"
		//         label="Calories"
		//       />

		//       <MacroProgressBar
		//         current={currentIntake.protein}
		//         goal={dailyGoal.protein}
		//         color="bg-[#F9DBBA]"
		//         label="Protein"
		//       />

		//       <MacroProgressBar
		//         current={currentIntake.carbs}
		//         goal={dailyGoal.carbs}
		//         color="bg-[#FFDCDC]"
		//         label="Carbs"
		//       />

		//       <MacroProgressBar
		//         current={currentIntake.fats}
		//         goal={dailyGoal.fats}
		//         color="bg-[#D4A5A5]"
		//         label="Fats"
		//       />
		//       <TouchableOpacity
		//           onPress={onAddMeal}
		//           className="bg-[#3BAEA0] mt-4 px-4 py-2 justify-center items-center rounded-full"
		//         >
		//           <Text className="text-white font-JakartaSemiBold">Add Meal</Text>
		//         </TouchableOpacity>

		//       <View className="mt-4 flex-row justify-between">
		//         <View className="items-center">
		//           <Text className="text-black font-JakartaSemiBold">
		//             {Math.round((currentIntake.protein + currentIntake.carbs + currentIntake.fats) /
		//             (dailyGoal.protein + dailyGoal.carbs + dailyGoal.fats) * 100)}%
		//           </Text>
		//           <Text className="text-neutral-400 text-sm">Daily Protein Goal</Text>
		//         </View>
		//         <View className="items-center">
		//           <Text className="text-black font-JakartaSemiBold">
		//             {currentIntake.protein + currentIntake.carbs + currentIntake.fats}g
		//           </Text>
		//           <Text className="text-neutral-400 text-sm">Total Intake</Text>
		//         </View>
		//       </View>
		//     </View>

		//     {/* Weekly Chart */}
		//     {/* <View className="bg-neutral-800 p-4 rounded-2xl">
		//       <Text className="text-xl font-JakartaBold text-white mb-4">Weekly Overview</Text>
		//       <LineChart
		//         data={chartData}
		//         height={200}
		//         width={300}
		//         spacing={40}
		//         initialSpacing={20}
		//         color="#494358"
		//         thickness={3}
		//         startFillColor="#494358"
		//         endFillColor="#494358"
		//         startOpacity={0.9}
		//         endOpacity={0.2}
		//         backgroundColor="transparent"
		//         xAxisColor="#494358"
		//         yAxisColor="#494358"
		//         yAxisTextStyle={{ color: '#fff' }}
		//         xAxisLabelTextStyle={{ color: '#fff' }}
		//         hideRules
		//         hideDataPoints
		//         curved
		//         dataPointsColor="#494358"
		//         dataPointsRadius={6}
		//         dataPointsWidth={3}
		//         dataPointsHeight={3}
		//         focusEnabled
		//         showStripOnFocus
		//         stripColor="#494358"
		//         stripWidth={2}
		//       />
		//     </View> */}
		//   </View>
		// </ScrollView>
	);
};

export default MacrosTracking;
