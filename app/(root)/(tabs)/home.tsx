import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import { CartesianChart, Line } from 'victory-native';
import { Link, useFocusEffect } from 'expo-router';
import { View, Text, Image, ScrollView, TouchableOpacity, Button, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Navbar from '@/components/Navbar';
import WeightTracking from '@/components/WeightTracking';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import ActivityTracking from '@/components/ActivityTracking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { images } from '@/constants/index';
import { useState, useEffect, useCallback } from 'react';
import { fetchAPI, useFetch } from '@/lib/fetch';
import { Weights } from '@/types/type';
import WeeklyTracking from '@/components/WeeklyTracking';
import MacrosTracking from '@/components/MacrosTracking';
import { Ionicons } from '@expo/vector-icons';
// import { DATA } from '@/lib/data'

export default function Page() {
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-[#ffffff]" style={{ paddingTop: insets.top }}>
			<SignedIn>
				<ScrollView stickyHeaderIndices={[0]} className="w-full h-full ">
					<Navbar />
					<View className="w-full pb-10">
						<WeeklyCalendar />
						<WeightTracking />
						<MacrosTracking
							dailyGoal={{
								protein: 245,
								carbs: 245,
								fats: 70,
							}}
							currentIntake={{
								protein: 216,
								carbs: 216,
								fats: 85,
							}}
							weeklyData={[
								{ date: 'Mon', protein: 220, carbs: 210, fats: 75 },
								{ date: 'Tue', protein: 215, carbs: 200, fats: 80 },
								{ date: 'Wed', protein: 225, carbs: 220, fats: 85 },
								{ date: 'Thu', protein: 210, carbs: 215, fats: 78 },
								{ date: 'Fri', protein: 230, carbs: 225, fats: 82 },
								{ date: 'Sat', protein: 216, carbs: 216, fats: 85 },
							]}
							// onAddMeal={handleAddWeightModal}
						/>
						<ActivityTracking />
					</View>
					{/* <View className="w-full  px-8 ">
						<Text className="text-white text-3xl font-JakartaSemiBold mt-8">Macros</Text>
						<View className="w-full h-40 rounded-md flex items-center flex-row justify-between">
							<View className="w-[30%] py-8 bg-blue-100 rounded-full">
								<Text className="text-center">216/245g</Text>
								<Text className="text-center font-JakartaSemiBold text-xl">Carbs</Text>
							</View>
							<View className="w-[30%] py-8 bg-yellow-100 rounded-full">
								<Text className="text-center">216/245g</Text>
								<Text className="text-center font-JakartaSemiBold text-xl">Fat</Text>
							</View>
							<View className="w-[30%] py-8 bg-green-100 rounded-full">
								<Text className="text-center">216/245g</Text>
								<Text className="text-center font-JakartaSemiBold text-xl">Protein</Text>
							</View>
						</View>
					</View> */}
					{/* <View className="w-full  px-8 pb-40">
						<Text className="text-white text-3xl font-JakartaSemiBold mt-8">
							Your {'\n'}
							Schedule
						</Text>
						<Text className="text-white mt-4">Today's Activity</Text>
						<View className="w-full ">
							
							<View className="h-20 my-2 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Bench Press</Text>
									<Text className="text-gray-200 ">4 sets of 12</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
							<View className="h-20 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Incline Dumbell Press</Text>
									<Text className="text-gray-200 ">4 sets of 12</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
							<View className="h-20 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Ball Shooting Drill</Text>
									<Text className="text-gray-200 ">50 made threes</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
							<View className="h-20 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Tricep Dips</Text>
									<Text className="text-gray-200 ">4 sets of 8</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
						</View>
					</View> */}
				</ScrollView>
			</SignedIn>
			<SignedOut>
				<Link href="/(auth)/sign-in">
					<Text>Sign in</Text>
				</Link>
				<Link href="/(auth)/sign-up">
					<Text>Sign up</Text>
				</Link>
			</SignedOut>
		</View>
	);
}
