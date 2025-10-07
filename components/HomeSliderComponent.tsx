import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import MiniDashboardTracking from './MiniDashboardTracking';
import CalorieChart from './CalorieChart';
import CaloriesBurnedChart from './CaloriesBurnedChart';
import { useDailyQuests } from '@/lib/useDailyQuests';

interface HomeSliderComponentProps {
	totalMealsLog?: number;
	totalWeightsLog?: number;
	totalExercisesLog?: number;
	refreshTrigger?: number;
	dashboardRefreshTrigger?: number;
	questRefreshTrigger?: number;
	onClose: () => void;
}

export default function HomeSliderComponent({
	totalMealsLog = 0,
	totalWeightsLog = 0,
	totalExercisesLog = 0,
	refreshTrigger = 0,
	dashboardRefreshTrigger = 0,
	questRefreshTrigger = 0,
	onClose,
}: HomeSliderComponentProps) {
	const router = useRouter();
	const [currentSlide, setCurrentSlide] = useState(0);
	const screenWidth = Dimensions.get('window').width;
	const { questStatus, streakDay, isLoading: questLoading } = useDailyQuests(questRefreshTrigger);

	return (
		<View className="w-full h-64">
			<ScrollView
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={event => {
					const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
					setCurrentSlide(slideIndex);
				}}
				className="w-full h-full"
			>
				{/* Slide 1: MiniDashboard and Mindfulness Cards */}
				<View style={{ width: screenWidth }} className="h-full px-4">
					<MiniDashboardTracking
						totalMealsLog={totalMealsLog}
						totalWeightsLog={totalWeightsLog}
						totalExercisesLog={totalExercisesLog}
						refreshTrigger={dashboardRefreshTrigger}
					/>
					<View className="flex-1  flex justify-center mt-2 ">
						<View className="flex-1  border-[1px] border-gray-200 p-2 px-4 rounded-xl">
							<View className="flex flex-row justify-between">
								<View className="flex flex-row items-center">
									<TouchableOpacity
										onPress={onClose}
										className="py-2 px-4 border-[1px] border-gray-200 bg-[#E3BBA1] rounded-xl"
									>
										<Text className="text-white font-JakartaSemiBold mr-2">Daily Quests</Text>
									</TouchableOpacity>

									{questStatus.allCompleted && (
										<View className="flex flex-row border-[1px] border-green-600 px-2 py-1 items-center rounded-lg">
											<Ionicons name="sparkles-outline" color={'green'} />
											<Text className="text-green-600 ml-1">Completed! </Text>
										</View>
									)}
								</View>

								<View className="flex flex-row items-center gap-1">
									<Ionicons name="flash-outline" />
									<Text>Day {streakDay}</Text>
								</View>
							</View>
							<View className="flex flex-row flex-1 items-center m-auto ">
								<View className=" py-1 px-4 items-center">
									<Ionicons
										name={questStatus.weight ? 'speedometer-outline' : 'ellipse-outline'}
										color={questStatus.weight ? 'green' : 'gray'}
										size={24}
										className="w-4 "
									/>
									<Text className="mt-2 ">Log Weight</Text>
								</View>
								<Text>---</Text>
								<View className=" py-1 px-4 items-center">
									<Ionicons
										name={questStatus.meal ? 'restaurant-outline' : 'ellipse-outline'}
										size={24}
										color={questStatus.meal ? 'green' : 'gray'}
										className="w-4"
									/>
									<Text className="mt-2 ">Log Meals</Text>
								</View>
								<Text>---</Text>
								<View className=" py-1 px-4 items-center">
									<Ionicons
										name={questStatus.exercise ? 'barbell-outline' : 'ellipse-outline'}
										size={24}
										color={questStatus.exercise ? 'green' : 'gray'}
										className="w-4"
									/>
									<Text className="mt-2 text-xs ">Log Exercises</Text>
								</View>
							</View>
						</View>
					</View>

					{/* Mindfulness Cards Section */}
					{/* <View className="flex flex-row justify-between px-0 mt-2 mb-6">
						Card 1: Awakened Manifesting
						<TouchableOpacity
							className="flex-1 items-center bg-white rounded-2xl border border-[#F5F2F0] mx-1 p-4 shadow-sm active:bg-[#F8F1ED]"
							onPress={() => router.push('/awakened-manifesting')}
						>
							<View className="w-12 h-12 rounded-full bg-[#F8F1ED] flex items-center justify-center mb-2">
								<Ionicons name="sparkles-outline" size={24} color={PRIMARY} />
							</View>
							<Text className="text-center text-secondary-800 font-JakartaSemiBold text-xs leading-tight">
								Awakened{'\n'}Manifesting
							</Text>
						</TouchableOpacity>
						Card 2: Recipe Breakdown
						<TouchableOpacity
			className="flex-1 items-center bg-white rounded-2xl border border-[#F5F2F0] mx-1 p-4 shadow-sm active:bg-[#F8F1ED]"
			onPress={() => setShowRecipeModal(true)}
		>
			<View className="w-12 h-12 rounded-full bg-[#F8F1ED] flex items-center justify-center mb-2">
				<Ionicons name="restaurant-outline" size={24} color={PRIMARY} />
			</View>
			<Text className="text-center text-secondary-800 font-JakartaSemiBold text-xs leading-tight">
				Recipe{'\n'}Breakdown
			</Text>
		</TouchableOpacity>
						Card 3: Deep Thinking
						<TouchableOpacity
							className="flex-1 items-center bg-white rounded-2xl border border-[#F5F2F0] mx-1 p-4 shadow-sm active:bg-[#F8F1ED]"
							onPress={() => router.push('/deep-focus')}
						>
							<View className="w-12 h-12 rounded-full bg-[#F8F1ED] flex items-center justify-center mb-2">
								<Ionicons name="bulb-outline" size={24} color={PRIMARY} />
							</View>
							<Text className="text-center text-secondary-800 font-JakartaSemiBold text-xs leading-tight">
								Deep{'\n'}Focus
							</Text>
						</TouchableOpacity>
					</View> */}
				</View>

				{/* Slide 2: Calorie Chart */}
				<View style={{ width: screenWidth }} className="h-full px-4">
					<View className="flex-1 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm">
						<CalorieChart refreshTrigger={refreshTrigger} />
					</View>
				</View>

				{/* Slide 3: Calories Burned Chart */}
				<View style={{ width: screenWidth }} className="h-full px-4">
					<View className="flex-1 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm">
						<CaloriesBurnedChart refreshTrigger={refreshTrigger} />
					</View>
				</View>
			</ScrollView>

			{/* Slider Indicators */}
			<View className="flex-row justify-center mt-4 space-x-2">
				<View
					className={`w-2 h-2 rounded-full ${currentSlide === 0 ? 'bg-[#E3BBA1]' : 'bg-gray-300'}`}
				/>
				<View
					className={`w-2 h-2 rounded-full ${currentSlide === 1 ? 'bg-[#E3BBA1]' : 'bg-gray-300'}`}
				/>
				<View
					className={`w-2 h-2 rounded-full ${currentSlide === 2 ? 'bg-[#E3BBA1]' : 'bg-gray-300'}`}
				/>
			</View>
		</View>
	);
}
