import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';

interface ExerciseItem {
	id: string;
	name: string;
	duration: string;
	workout_type: string;
	session_title?: string; // Title of the session this exercise belongs to
	session_id?: string; // ID of the session (for barbell workouts)
	calories_burned?: number; // Estimated calories burned
}

interface SwipeableExerciseCardProps {
	exercise: ExerciseItem;
	onDelete: (exerciseId: string) => void;
	onToggleCompletion?: (exerciseId: string, isCompleted: boolean) => void;
}

const SwipeableExerciseCard: React.FC<SwipeableExerciseCardProps> = ({
	exercise,
	onDelete,
	onToggleCompletion,
}) => {
	const translateX = useRef(new Animated.Value(0)).current;
	const [isCompleted, setIsCompleted] = useState(false);
	const deleteButtonWidth = 80;
	const swipeThreshold = 50; // Threshold for swipe-right to toggle completion

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
			} else if (translationX > swipeThreshold) {
				// Swipe right enough to toggle completion
				handleToggleCompletion();
				// Snap back to original position
				Animated.spring(translateX, {
					toValue: 0,
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
		const exerciseType = exercise.workout_type === 'barbell' ? 'workout session' : 'exercise';
		console.log('Delete button pressed for exercise:', exercise);
		Alert.alert('Delete Exercise', `Are you sure you want to delete this ${exerciseType}?`, [
			{
				text: 'Cancel',
				style: 'cancel',
			},
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					console.log('Delete confirmed, calling onDelete');
					onDelete(exercise.id);
					// Animate back to original position
					Animated.spring(translateX, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				},
			},
		]);
	};

	const handleToggleCompletion = () => {
		const newCompletionStatus = !isCompleted;
		setIsCompleted(newCompletionStatus);

		if (onToggleCompletion) {
			onToggleCompletion(exercise.id, newCompletionStatus);
		}
	};

	const resetPosition = () => {
		Animated.spring(translateX, {
			toValue: 0,
			useNativeDriver: true,
		}).start();
	};

	const getExerciseIcon = () => {
		return exercise.workout_type === 'barbell' ? 'barbell-outline' : 'heart-outline';
	};

	const getExerciseTypeLabel = () => {
		return exercise.workout_type === 'barbell'
			? exercise.session_title || 'Workout Session'
			: 'Exercise';
	};

	return (
		<View className="relative my-2">
			{/* Delete Button (Background) */}
			<View className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 rounded-xl justify-center items-center">
				<TouchableOpacity
					onPress={handleDelete}
					className="w-full h-full justify-center items-center"
				>
					<Ionicons name="trash-outline" size={24} color="white" />
				</TouchableOpacity>
			</View>

			{/* Completion Hint (Background) */}
			<View
				className={`absolute left-0 top-0 bottom-0 w-20 rounded-xl justify-center items-center ${
					isCompleted ? 'bg-yellow-500' : 'bg-green-500'
				}`}
			>
				<View className="items-center">
					<Ionicons
						name={isCompleted ? 'close-circle-outline' : 'checkmark-circle-outline'}
						size={20}
						color="white"
					/>
					<Text className="text-white text-xs text-center mt-1 font-JakartaSemiBold">
						{isCompleted ? 'Undo' : 'Complete'}
					</Text>
				</View>
			</View>

			{/* Exercise Card (Foreground) */}
			<PanGestureHandler
				onGestureEvent={onGestureEvent}
				onHandlerStateChange={onHandlerStateChange}
			>
				<Animated.View
					style={{
						transform: [{ translateX }],
					}}
					className={`w-full h-24 py-3 px-3 rounded-xl border-solid border-[1px] bg-white ${
						isCompleted ? 'bg-green-200 border-green-300' : 'border-[#F1F5F9]'
					}`}
				>
					<View className="flex flex-row justify-between items-center">
						<View className="flex flex-row items-center flex-1">
							<Ionicons
								name={getExerciseIcon()}
								size={20}
								color="#E3BBA1"
								style={{ marginRight: 8 }}
							/>
							<View className="flex-1">
								<Text className="font-JakartaSemiBold text-sm text-gray-900">{exercise.name}</Text>
								<Text className="text-xs text-[#64748B] mt-1">{getExerciseTypeLabel()}</Text>
								<Text className="text-xs text-[#64748B] mt-1">{exercise.duration}</Text>
							</View>
						</View>
						<View className="items-end">
							<View className="flex flex-row gap-2">
								<SimpleLineIcons name="fire" size={14} color="#5A556B" />
								<Text className="text-[#64748B]">
									{exercise.calories_burned ? `${exercise.calories_burned} cal` : '--'}
								</Text>
							</View>
						</View>
					</View>
				</Animated.View>
			</PanGestureHandler>
		</View>
	);
};

export default SwipeableExerciseCard;
