import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useState } from 'react';

const WorkoutScheduleCard = (props: any) => {
	const [collapsed, setCollapsed] = useState(true);

	// Format the workout date to "Day Date" format
	const formatWorkoutDate = (dateString: string) => {
		const date = new Date(dateString);
		const day = date.toLocaleDateString('en-US', { weekday: 'short' });
		const dayNumber = date.getDate();
		return `${day} ${dayNumber}`;
	};

	return (
		<View
			className={`w-full ${collapsed ? 'h-28' : 'h-auto'}  overflow-hidden my-2 py-4 px-3 rounded-xl border-solid border-[1px] border-[#F1F5F9] `}
		>
			<View className="flex flex-row justify-between items-center">
				<View className="flex flex-row w-full justify-between items-center">
					<Text className="font-JakartaSemiBold">{props.workout.name}</Text>

					<View className="flex flex-row items-center gap-2">
						<View className="flex flex-row items-center">
							<SimpleLineIcons name="fire" size={12} color="#64748B" />
							<Text className="font-JakartaSemiBold ml-1 text-xs text-[#64748B]">
								{props.workout.totalCaloriesBurned} cal
							</Text>
						</View>

						<View className="flex flex-row items-center">
							<Ionicons name="timer-outline" size={12} color="#64748B" />
							<Text className="font-JakartaSemiBold ml-1 text-xs text-[#64748B]">
								{props.workout.duration}
							</Text>
						</View>
					</View>
				</View>
			</View>
			<Text className="text-xs font-JakartaSemiBold mb-1 text-[#E3BBA1]">
				{formatWorkoutDate(props.workout.date)}
			</Text>
			{props.workout.exercises.map((exercise: any, index: number) => (
				<View className="flex flex-row justify-between items-center " key={index}>
					<View className="flex flex-row items-center">
						<Text className="text-xs font-JakartaRegular text-[#64748B]">{exercise.name} • </Text>
						<Text className="text-xs font-JakartaRegular text-[#64748B]">
							{exercise.sets} x {exercise.reps}
						</Text>
					</View>
				</View>
			))}

			<TouchableOpacity
				className="flex flex-row justify-center items-center absolute bottom-0 left-0 right-0 p-1"
				onPress={() => setCollapsed(!collapsed)}
			>
				<Text className="text-xs font-JakartaSemiBold text-[#E3BBA1]">
					{collapsed ? 'View More' : 'View Less'}
				</Text>
				<Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color="#E3BBA1" />
			</TouchableOpacity>
		</View>
	);
};

export default WorkoutScheduleCard;
