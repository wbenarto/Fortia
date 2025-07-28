import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

import CustomButton from './CustomButton';
import InputField from './InputField';

interface Exercise {
	id: string;
	name: string;
	sets: string;
	reps: string;
	weight: string;
}

interface NewWorkoutModalProps {
	isVisible: boolean;
	onClose: () => void;
	onSave: (workout: any) => void;
}

type TabType = 'exercise' | 'barbell';

const NewWorkoutModal = ({ isVisible, onClose, onSave }: NewWorkoutModalProps) => {
	const [title, setTitle] = useState('');
	const [duration, setDuration] = useState('');
	const [description, setDescription] = useState('');
	const [exercises, setExercises] = useState<Exercise[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>('exercise');

	const addExercise = () => {
		const newExercise: Exercise = {
			id: Date.now().toString(),
			name: '',
			sets: '',
			reps: '',
			weight: '',
		};
		setExercises([...exercises, newExercise]);
	};

	const updateExercise = (id: string, field: keyof Exercise, value: string) => {
		setExercises(
			exercises.map(exercise => (exercise.id === id ? { ...exercise, [field]: value } : exercise))
		);
	};

	const removeExercise = (id: string) => {
		setExercises(exercises.filter(exercise => exercise.id !== id));
	};

	const handleSave = async () => {
		if (!title.trim()) {
			// Show error for missing title
			return;
		}

		setIsLoading(true);
		try {
			const workoutData = {
				type: activeTab,
				title: title.trim(),
				duration: duration.trim(),
				description: description.trim(),
				exercises: exercises.filter(exercise => exercise.name.trim() !== ''),
			};

			await onSave(workoutData);

			// Reset form
			setTitle('');
			setDescription('');
			setDuration('');
			setExercises([]);
			onClose();
		} catch (error) {
			console.error('Error saving workout:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setTitle('');
		setDescription('');
		setDuration('');
		setExercises([]);
		onClose();
	};

	return (
		<ReactNativeModal
			className="w-full h-full px-2 m-0 mt-14 "
			isVisible={isVisible}
			onBackdropPress={resetForm}
		>
			<View className="bg-white w-full h-full rounded-[40px]">
				{/* Header */}
				<View className="p-4 flex bg-white flex-row justify-between items-cente rounded-xl ">
					<Text className="text-xl text-center font-JakartaSemiBold">Schedule New Workout</Text>
					<TouchableOpacity onPress={resetForm}>
						<Ionicons name="close" size={24} color="black" />
					</TouchableOpacity>
				</View>

				{/* Tabs */}
				<View className="flex flex-row justify-between items-center my-4 px-20">
					<View className="items-center">
						<TouchableOpacity
							onPress={() => setActiveTab('exercise')}
							className={`flex justify-center items-center rounded-full p-6 border-[1px] ${
								activeTab === 'exercise' ? 'bg-green-200 border-gray-400' : 'bg-white'
							}`}
						>
							<Ionicons
								name="heart-outline"
								size={30}
								color={activeTab === 'exercise' ? 'black' : 'black'}
							/>
						</TouchableOpacity>
						<Text className="text-xs font-JakartaSemiBold mt-2 text-black">Exercise</Text>
					</View>
					<View className="items-center">
						<TouchableOpacity
							onPress={() => setActiveTab('barbell')}
							className={`flex justify-center items-center rounded-full p-6 border-[1px] ${
								activeTab === 'barbell' ? 'bg-blue-200 border-gray-400' : 'bg-white'
							}`}
						>
							<Ionicons
								name="barbell-outline"
								size={30}
								color={activeTab === 'barbell' ? 'black' : 'black'}
							/>
						</TouchableOpacity>
						<Text className="text-xs font-JakartaSemiBold mt-2 text-black">Plan a Session</Text>
					</View>
				</View>

				<ScrollView className="flex-1 w-full pt-2 px-4" showsVerticalScrollIndicator={false}>
					<View className="flex flex-row items-center justify-between  bg-white rounded-xl border-[1px] border-gray-400 p-2 mb-4">
						<Ionicons name="calendar-outline" size={20} color="black" />
						<Text className="text-xs ml-4 font-JakartaSemiBold text-gray-400">Select Date</Text>
						<Ionicons name="chevron-down-outline" size={20} color="black" />
					</View>

					{activeTab === 'exercise' ? (
						// Biking tab: only ask for workout title
						<>
							<View className="mb-4 bg-white rounded-xl">
								<InputField
									label="Exercise Name"
									labelStyle="text-sm"
									placeholder="e.g. Morning Bike Ride, Light Run, Swimming, etc..."
									value={title}
									onChangeText={setTitle}
									className="text-left text-sm placeholder:text-xs border-none"
								/>
							</View>

							<View className="mb-4 bg-white rounded-xl">
								<InputField
									label="Exercise Duration"
									labelStyle="text-sm"
									placeholder="e.g. 30 minutes or 2 miles..."
									value={duration}
									onChangeText={setDuration}
									className="text-left text-sm placeholder:text-xs border-none"
								/>
							</View>
							<View className="mb-4 bg-white rounded-xl">
								<Text className="text-[8px] text-center font-JakartaLight text-black">
									The idea is to describe the exercises in a more natural way. E.g. "Ran 3 miles",
									"Swam 20 laps", "Walked 5 miles", "Played 18 holes of golf"
								</Text>
							</View>
						</>
					) : (
						// Barbell tab: show full workout form
						<>
							<View className="mb-4 bg-white rounded-xl">
								<InputField
									label="Workout Title"
									labelStyle="text-sm"
									placeholder="e.g. Upper Body Strength, Cardio Circuit..."
									value={title}
									onChangeText={setTitle}
									className="text-left text-sm placeholder:text-xs border-none"
								/>
							</View>
							<View className="mb-4 bg-white  rounded-xl">
								<InputField
									label="Description (Optional)"
									placeholder="Brief description of your workout..."
									value={description}
									onChangeText={setDescription}
									multiline
									numberOfLines={3}
									className="text-left"
								/>
							</View>
							<View className="mb-4 rounded-xl">
								<View className="flex flex-row justify-between items-center mb-3">
									<Text className="text-md font-JakartaSemiBold text-black">Exercises</Text>
									<TouchableOpacity
										onPress={addExercise}
										className=" px-3 py-1 border-[1px] border-gray-400 rounded-full"
									>
										<Text className="text-black text-xs ">Add Exercise</Text>
									</TouchableOpacity>
								</View>
								{exercises.length === 0 ? (
									<View className="h-20 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#F1F5F9] bg-white">
										<Text className="text-center text-[#64748B] font-JakartaMedium">
											No exercises added yet
										</Text>
									</View>
								) : (
									exercises.map((exercise, index) => (
										<View
											key={exercise.id}
											className="mb-3 p-2 rounded-2xl border-[1px] border-[#F1F5F9] border-solid bg-white"
										>
											{/* Exercise Name */}
											<View className="mb-3">
												<InputField
													placeholder="Exercise name"
													value={exercise.name}
													onChangeText={value => updateExercise(exercise.id, 'name', value)}
													className="text-left text-xs"
												/>
											</View>
											{/* Exercise Details Row */}
											<View className="flex flex-row gap-2">
												<View className="flex-1">
													<InputField
														placeholder="Weight (lbs)"
														value={exercise.weight}
														onChangeText={value => updateExercise(exercise.id, 'weight', value)}
														keyboardType="numeric"
														className="text-center text-xs"
													/>
												</View>
												<View className="flex justify-center items-center">
													<Text className="text-xs font-JakartaBold">X</Text>
												</View>

												<View className="w-12">
													<InputField
														placeholder="Reps"
														value={exercise.reps}
														onChangeText={value => updateExercise(exercise.id, 'reps', value)}
														keyboardType="numeric"
														className="text-center text-xs"
													/>
												</View>
												<View className="flex justify-center items-center">
													<Text className="text-xs font-JakartaBold">X</Text>
												</View>
												<View className=" w-12">
													<InputField
														placeholder="Sets"
														value={exercise.sets}
														onChangeText={value => updateExercise(exercise.id, 'sets', value)}
														keyboardType="numeric"
														className="text-center text-xs"
													/>
												</View>
												<View className=" w-10 flex justify-center items-center">
													<TouchableOpacity onPress={() => removeExercise(exercise.id)}>
														<Ionicons name="trash-outline" size={16} color="#F56565" />
													</TouchableOpacity>
												</View>
											</View>
										</View>
									))
								)}
							</View>
						</>
					)}

					{/* Save Button */}
					<View className="pt-4 mb-4 bg-white p-2 rounded-xl">
						{isLoading ? (
							<View className="py-3 rounded-lg bg-gray-200 flex flex-row items-center justify-center">
								<ActivityIndicator size="small" color="#E3BBA1" />
								<Text className="ml-2 font-JakartaSemiBold text-gray-500">Saving...</Text>
							</View>
						) : (
							<TouchableOpacity
								className={`py-3 rounded-lg ${title.trim() ? 'bg-[#E3BBA1]' : 'bg-gray-200'}`}
								onPress={handleSave}
								disabled={!title.trim() || isLoading}
							>
								<Text
									className={`text-center font-JakartaSemiBold ${
										title.trim() ? 'text-white' : 'text-gray-500'
									}`}
								>
									Save Workout
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</ScrollView>
			</View>
		</ReactNativeModal>
	);
};

export default NewWorkoutModal;
