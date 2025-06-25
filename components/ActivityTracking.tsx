import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import CustomButton from './CustomButton';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';

const ActivityTracking = () => {
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

				<CustomButton onPress={() => console.log('im here')} title="Start Workout" />
			</View>
		</View>
	);
};

export default ActivityTracking;
