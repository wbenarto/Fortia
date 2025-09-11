import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY } from '@/constants/colors';
import MiniDashboardTracking from './MiniDashboardTracking';
import CalorieChart from './CalorieChart';
import CaloriesBurnedChart from './CaloriesBurnedChart';

interface HomeSliderComponentProps {
	totalMealsLog?: number;
	totalWeightsLog?: number;
	totalExercisesLog?: number;
	refreshTrigger?: number;
	dashboardRefreshTrigger?: number;
}

export default function HomeSliderComponent({
	totalMealsLog = 0,
	totalWeightsLog = 0,
	totalExercisesLog = 0,
	refreshTrigger = 0,
	dashboardRefreshTrigger = 0,
}: HomeSliderComponentProps) {
	const router = useRouter();
	const [currentSlide, setCurrentSlide] = useState(0);
	const screenWidth = Dimensions.get('window').width;

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

					{/* Mindfulness Cards Section */}
					<View className="flex flex-row justify-between px-0 mt-2 mb-6">
						{/* Card 1: Awakened Manifesting */}
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
						{/* Card 2: Recipe Breakdown */}
						{/* <TouchableOpacity
			className="flex-1 items-center bg-white rounded-2xl border border-[#F5F2F0] mx-1 p-4 shadow-sm active:bg-[#F8F1ED]"
			onPress={() => setShowRecipeModal(true)}
		>
			<View className="w-12 h-12 rounded-full bg-[#F8F1ED] flex items-center justify-center mb-2">
				<Ionicons name="restaurant-outline" size={24} color={PRIMARY} />
			</View>
			<Text className="text-center text-secondary-800 font-JakartaSemiBold text-xs leading-tight">
				Recipe{'\n'}Breakdown
			</Text>
		</TouchableOpacity> */}
						{/* Card 3: Deep Thinking */}
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
					</View>
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
