import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

interface FoodItem {
	name: string;
	weight: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	mealType: string;
}

interface SwipeableFoodCardProps {
	food: FoodItem;
	mealId: string;
	onDelete: (mealId: string) => void;
}

const SwipeableFoodCard: React.FC<SwipeableFoodCardProps> = ({ food, mealId, onDelete }) => {
	const translateX = useRef(new Animated.Value(0)).current;
	const deleteButtonWidth = 80;

	const onGestureEvent = Animated.event([{ nativeEvent: { translationX: translateX } }], {
		useNativeDriver: true,
	});

	const onHandlerStateChange = (event: any) => {
		if (event.nativeEvent.state === State.END) {
			const { translationX } = event.nativeEvent;

			if (translationX < -deleteButtonWidth / 2) {
				// Swipe left enough to show delete button
				Animated.spring(translateX, {
					toValue: -deleteButtonWidth,
					useNativeDriver: true,
				}).start();
			} else {
				// Snap back to original position
				Animated.spring(translateX, {
					toValue: 0,
					useNativeDriver: true,
				}).start();
			}
		}
	};

	const handleDelete = () => {
		Alert.alert('Delete Meal', `Are you sure you want to delete "${food.name}"?`, [
			{
				text: 'Cancel',
				style: 'cancel',
			},
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					onDelete(mealId);
					// Animate back to original position
					Animated.spring(translateX, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				},
			},
		]);
	};

	const resetPosition = () => {
		Animated.spring(translateX, {
			toValue: 0,
			useNativeDriver: true,
		}).start();
	};

	return (
		<View className="relative my-1">
			{/* Delete Button (Background) */}
			<View className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 rounded-xl justify-center items-center">
				<TouchableOpacity
					onPress={handleDelete}
					className="w-full h-full justify-center items-center"
				>
					<Ionicons name="trash-outline" size={24} color="white" />
				</TouchableOpacity>
			</View>

			{/* Food Card (Foreground) */}
			<PanGestureHandler
				onGestureEvent={onGestureEvent}
				onHandlerStateChange={onHandlerStateChange}
			>
				<Animated.View
					style={{
						transform: [{ translateX }],
					}}
					className="w-full bg-white py-2 px-3 rounded-xl border-solid border-[1px] border-[#F1F5F9] "
				>
					<View className="flex flex-row items-center justify-between my-1 ">
						<Text className="font-JakartaSemiBold min-w-[170px]  ">{food.name} </Text>
						<Text className="text-[12px] text-[#64748B] ">• {food.weight}</Text>
						<View className="border-solid border-black border-[.5px] px-2 rounded-xl">
							<Text className="text-[10px] text-[#64748B] text-gray-800 capitalize">
								{food.mealType}
							</Text>
						</View>
					</View>
					<View className="flex flex-row justify-between items-center">
						<Text className="text-[12px] text-[#64748B]">{food.calories} cal</Text>
						<Text className="text-[12px] text-[#64748B]">{Math.round(food.protein)}g protein</Text>
						<Text className="text-[12px] text-[#64748B]">{Math.round(food.carbs)}g carbs</Text>
						<Text className="text-[12px] text-[#64748B]">{Math.round(food.fats)}g fats</Text>
					</View>
				</Animated.View>
			</PanGestureHandler>
		</View>
	);
};

export default SwipeableFoodCard;
