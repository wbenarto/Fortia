import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';

interface ActivityItem {
	id: string;
	activity_description: string;
	estimated_calories: number;
	date: string;
	created_at: string;
}

interface SwipeableActivityCardProps {
	activity: ActivityItem;
	onDelete: (activityId: string) => void;
}

const SwipeableActivityCard: React.FC<SwipeableActivityCardProps> = ({ activity, onDelete }) => {
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
		Alert.alert(
			'Delete Activity',
			`Are you sure you want to delete "${activity.activity_description}"?`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						onDelete(activity.id);
						// Animate back to original position
						Animated.spring(translateX, {
							toValue: 0,
							useNativeDriver: true,
						}).start();
					},
				},
			]
		);
	};

	const resetPosition = () => {
		Animated.spring(translateX, {
			toValue: 0,
			useNativeDriver: true,
		}).start();
	};

	return (
		<View className="relative my-2">
			{/* Delete Button (Background) */}
			<View className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 rounded-2xl justify-center items-center">
				<TouchableOpacity
					onPress={handleDelete}
					className="w-full h-full justify-center items-center"
				>
					<Ionicons name="trash-outline" size={24} color="white" />
				</TouchableOpacity>
			</View>

			{/* Activity Card (Foreground) */}
			<PanGestureHandler
				onGestureEvent={onGestureEvent}
				onHandlerStateChange={onHandlerStateChange}
			>
				<Animated.View
					style={{
						transform: [{ translateX }],
					}}
					className="w-full h-16 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#E3BBA1] bg-white"
				>
					<View className="flex flex-row gap-2 mb-2 items-center">
						<Ionicons name="barbell-outline" size={14} color="#5A556B" />
						<Text className="text-xs text-[#64748B]">Exercise</Text>
					</View>
					<View className="flex flex-row justify-between items-center">
						<Text className="text-xs font-JakartSemiBold" numberOfLines={1} ellipsizeMode="tail">
							{activity.activity_description}
						</Text>
						<View className="flex flex-row gap-2">
							<SimpleLineIcons name="fire" size={14} colors="#5A556B" />
							<Text className="text-[#64748B]">~{activity.estimated_calories} cal</Text>
						</View>
					</View>
				</Animated.View>
			</PanGestureHandler>
		</View>
	);
};

export default SwipeableActivityCard;
