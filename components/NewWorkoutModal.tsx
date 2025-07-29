import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import CalendarPicker from 'react-native-calendar-picker';
import { fetchAPI } from '@/lib/fetch';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';

import CustomButton from './CustomButton';
import InputField from './InputField';

interface Exercise {
	id: string;
	name: string;
	sets: string;
	reps: string;
	weight: string;
	duration: string; // Will store either cardio duration or strength format: "{weight} lbs * {reps} reps * {sets} sets"
}

interface NewWorkoutModalProps {
	isVisible: boolean;
	onClose: () => void;
	onSave: (workout: any) => void;
	userId?: string;
}

type TabType = 'exercise' | 'barbell';

const NewWorkoutModal = ({ isVisible, onClose, onSave, userId }: NewWorkoutModalProps) => {
	// Exercise tab state
	const [exerciseTitle, setExerciseTitle] = useState('');
	const [exerciseDuration, setExerciseDuration] = useState('');

	// Barbell tab state
	const [workoutTitle, setWorkoutTitle] = useState('');
	const [exercises, setExercises] = useState<Exercise[]>([]);

	// Shared state
	const [isLoading, setIsLoading] = useState(false);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>('exercise');
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [showCalendar, setShowCalendar] = useState(false);
	const [showExerciseDetails, setShowExerciseDetails] = useState(true); // For toggling between weight/reps/sets and duration mode

	// Reset to exercise tab when modal opens
	useEffect(() => {
		if (isVisible) {
			setActiveTab('exercise');
		}
	}, [isVisible]);

	// Handle tab switching and clear forms
	const handleTabSwitch = (newTab: TabType) => {
		if (newTab !== activeTab) {
			// Clear forms when switching tabs
			if (newTab === 'exercise') {
				setWorkoutTitle('');
				setExercises([]);
			} else {
				setExerciseTitle('');
				setExerciseDuration('');
			}
			setActiveTab(newTab);
		}
	};

	const addExercise = () => {
		const newExercise: Exercise = {
			id: Date.now().toString(),
			name: '',
			sets: '',
			reps: '',
			weight: '',
			duration: '',
		};
		setExercises([...exercises, newExercise]);
	};

	const updateExercise = (id: string, field: keyof Exercise, value: string) => {
		setExercises(
			exercises.map(exercise => {
				if (exercise.id === id) {
					const updatedExercise = { ...exercise, [field]: value };

					// Auto-format duration for strength training
					if (showExerciseDetails && (field === 'weight' || field === 'reps' || field === 'sets')) {
						const weight = field === 'weight' ? value : exercise.weight;
						const reps = field === 'reps' ? value : exercise.reps;
						const sets = field === 'sets' ? value : exercise.sets;

						// Only format if we have all three values
						if (weight && reps && sets) {
							updatedExercise.duration = `${weight} lbs * ${reps} reps * ${sets} sets`;
						} else {
							updatedExercise.duration = '';
						}
					}

					return updatedExercise;
				}
				return exercise;
			})
		);
	};

	const removeExercise = (id: string) => {
		setExercises(exercises.filter(exercise => exercise.id !== id));
	};

	const handleSave = async () => {
		// Get current tab's data
		const currentTitle = activeTab === 'exercise' ? exerciseTitle : workoutTitle;

		// Validation for both tabs
		if (!currentTitle.trim()) {
			// Show error for missing title
			return;
		}

		// Additional validation for exercise tab
		if (activeTab === 'exercise' && !exerciseDuration.trim()) {
			// Show error for missing duration
			return;
		}

		// Additional validation for barbell tab
		if (activeTab === 'barbell') {
			const validExercises = exercises.filter(
				exercise =>
					exercise.name.trim() !== '' &&
					exercise.weight.trim() !== '' &&
					exercise.reps.trim() !== '' &&
					exercise.sets.trim() !== ''
			);
			if (validExercises.length === 0) {
				// Show error for missing exercises or incomplete exercise data
				return;
			}
		}

		setIsLoading(true);
		try {
			let calories_burned = null;
			let analyzedExercises = [];

			// For single exercises, analyze calories first
			if (activeTab === 'exercise') {
				setIsAnalyzing(true);
				try {
					const analysisResponse = await fetchAPI('/(api)/exercise-analysis', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							exerciseDescription: currentTitle.trim(),
							duration: exerciseDuration,
							userId: userId || 'temp-user-id',
						}),
					});

					if (analysisResponse.success) {
						calories_burned = analysisResponse.data.calories_burned;
						console.log('Exercise analysis successful');
					} else {
						console.error('Exercise analysis failed:', analysisResponse.error);
						// Continue without calories if analysis fails
					}
				} catch (error) {
					console.error('Error analyzing exercise:', error);
					// Continue without calories if analysis fails
				} finally {
					setIsAnalyzing(false);
				}
			}

			// For barbell sessions, analyze each exercise individually
			if (activeTab === 'barbell') {
				setIsAnalyzing(true);
				const validExercises = exercises.filter(
					exercise =>
						exercise.name.trim() !== '' &&
						exercise.weight.trim() !== '' &&
						exercise.reps.trim() !== '' &&
						exercise.sets.trim() !== ''
				);

				// Analyze each exercise for calories
				for (let i = 0; i < validExercises.length; i++) {
					const exercise = validExercises[i];
					try {
						const analysisResponse = await fetchAPI('/(api)/exercise-analysis', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								exerciseDescription: exercise.name.trim(),
								duration: exercise.duration,
								userId: userId || 'temp-user-id',
							}),
						});

						if (analysisResponse.success) {
							analyzedExercises.push({
								...exercise,
								calories_burned: analysisResponse.data.calories_burned,
							});
							console.log(`Exercise ${i + 1} analysis successful`);
						} else {
							console.error(`Exercise ${i + 1} analysis failed:`, analysisResponse.error);
							// Continue without calories if analysis fails
							analyzedExercises.push({
								...exercise,
								calories_burned: null,
							});
						}
					} catch (error) {
						console.error(`Error analyzing exercise ${i + 1}:`, error);
						// Continue without calories if analysis fails
						analyzedExercises.push({
							...exercise,
							calories_burned: null,
						});
					}
				}
				setIsAnalyzing(false);
			}

			const workoutData = {
				type: activeTab,
				title: currentTitle.trim(),
				selectedDate: selectedDate ? getLocalDate(selectedDate) : getTodayDate(),
				duration: activeTab === 'exercise' ? exerciseDuration : undefined,
				calories_burned: calories_burned,
				exercises: activeTab === 'barbell' ? analyzedExercises : [],
			};

			await onSave(workoutData);

			// Reset form based on active tab
			if (activeTab === 'exercise') {
				setExerciseTitle('');
				setExerciseDuration('');
			} else {
				setWorkoutTitle('');
				setExercises([]);
			}
			onClose();
		} catch (error) {
			console.error('Error saving workout:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const resetForm = () => {
		setExerciseTitle('');
		setExerciseDuration('');
		setWorkoutTitle('');
		setExercises([]);
		setSelectedDate(null);
		setShowCalendar(false);
		setActiveTab('exercise'); // Always reset to exercise tab
		onClose();
	};

	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
		setShowCalendar(false);
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		});
	};

	// Helper function to filter numeric input
	const filterNumericInput = (value: string) => {
		return value.replace(/[^0-9]/g, '');
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
							onPress={() => handleTabSwitch('exercise')}
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
							onPress={() => handleTabSwitch('barbell')}
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
					<TouchableOpacity
						onPress={() => setShowCalendar(!showCalendar)}
						className="flex flex-row items-center justify-between bg-white rounded-xl border-[1px] border-gray-400 p-2 mb-4"
					>
						<Ionicons name="calendar-outline" size={20} color="black" />
						<Text className="text-xs ml-4 font-JakartaSemiBold text-gray-400">
							{selectedDate ? formatDate(selectedDate) : 'Select Date'}
						</Text>
						<Ionicons
							name={showCalendar ? 'chevron-up-outline' : 'chevron-down-outline'}
							size={20}
							color="black"
						/>
					</TouchableOpacity>

					{showCalendar && (
						<View className="mb-4 bg-white rounded-xl border-[1px] border-gray-400 p-4">
							<CalendarPicker
								onDateChange={handleDateSelect}
								selectedStartDate={selectedDate || undefined}
								minDate={new Date()} // Disable previous dates
								selectedDayColor="#E3BBA1"
								selectedDayTextColor="#FFFFFF"
								todayBackgroundColor="#F1F5F9"
								todayTextStyle={{ color: '#000000' }}
								textStyle={{ fontFamily: 'PlusJakartaSans-Regular' }}
								previousTitle="Previous"
								nextTitle="Next"
								previousTitleStyle={{ color: '#E3BBA1' }}
								nextTitleStyle={{ color: '#E3BBA1' }}
								monthTitleStyle={{
									fontFamily: 'PlusJakartaSans-SemiBold',
									color: '#000000',
									fontSize: 16,
								}}
								yearTitleStyle={{
									fontFamily: 'PlusJakartaSans-SemiBold',
									color: '#000000',
									fontSize: 16,
								}}
								width={320}
							/>
						</View>
					)}

					{activeTab === 'exercise' ? (
						// Biking tab: only ask for workout title
						<>
							<View className="mb-4 bg-white rounded-xl">
								<InputField
									label="Exercise Name"
									labelStyle="text-sm"
									placeholder="e.g. Morning Bike Ride, Light Run, Swimming, etc..."
									value={exerciseTitle}
									onChangeText={setExerciseTitle}
									className="text-left text-sm placeholder:text-xs border-none"
								/>
							</View>

							<View className="mb-4 bg-white rounded-xl">
								<InputField
									label="Exercise Duration"
									labelStyle="text-sm"
									placeholder="e.g. 30 minutes or 2 miles..."
									value={exerciseDuration}
									onChangeText={setExerciseDuration}
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
									value={workoutTitle}
									onChangeText={setWorkoutTitle}
									className="text-left text-sm placeholder:text-xs border-none"
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
											<View className="flex flex-row">
												{showExerciseDetails ? (
													<>
														<View className="w-1/3">
															<InputField
																placeholder="Weight (lbs)"
																value={exercise.weight}
																onChangeText={value =>
																	updateExercise(exercise.id, 'weight', filterNumericInput(value))
																}
																keyboardType="numeric"
																className="text-center text-xs"
															/>
														</View>
														<View className="flex justify-center items-center">
															<Text className="text-xs font-JakartaBold">X</Text>
														</View>

														<View className="w-1/5">
															<InputField
																placeholder="Reps"
																value={exercise.reps}
																onChangeText={value =>
																	updateExercise(exercise.id, 'reps', filterNumericInput(value))
																}
																keyboardType="numeric"
																className="text-center text-xs"
															/>
														</View>
														<View className="flex justify-center items-center">
															<Text className="text-xs font-JakartaBold">X</Text>
														</View>
														<View className=" w-1/5">
															<InputField
																placeholder="Sets"
																value={exercise.sets}
																onChangeText={value =>
																	updateExercise(exercise.id, 'sets', filterNumericInput(value))
																}
																keyboardType="numeric"
																className="text-center text-xs"
															/>
														</View>
													</>
												) : (
													<>
														<View className="w-3/4 bg-white rounded-xl">
															<InputField
																labelStyle="text-sm"
																placeholder="e.g. 30 minutes or 2 miles..."
																value={exercise.duration || ''}
																onChangeText={value =>
																	updateExercise(exercise.id, 'duration', value)
																}
																className="text-left text-sm placeholder:text-xs border-none"
															/>
														</View>
													</>
												)}

												<View className="flex flex-row flex-1 justify-end">
													<View className=" w-8  flex justify-center items-center">
														<TouchableOpacity
															onPress={() => setShowExerciseDetails(!showExerciseDetails)}
														>
															<Ionicons name="swap-horizontal-outline" size={16} color="black" />
														</TouchableOpacity>
													</View>
													<View className=" w-8   flex justify-center items-center">
														<TouchableOpacity onPress={() => removeExercise(exercise.id)}>
															<Ionicons name="trash-outline" size={16} color="#F56565" />
														</TouchableOpacity>
													</View>
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
						{isLoading || isAnalyzing ? (
							<View className="py-3 rounded-lg bg-gray-200 flex flex-row items-center justify-center">
								<ActivityIndicator size="small" color="#E3BBA1" />
								<Text className="ml-2 font-JakartaSemiBold text-gray-500">
									{isAnalyzing ? 'Analyzing exercise...' : 'Saving...'}
								</Text>
							</View>
						) : (
							<TouchableOpacity
								className={`py-3 rounded-lg ${
									(
										activeTab === 'exercise'
											? exerciseTitle.trim() && exerciseDuration.trim()
											: workoutTitle.trim() &&
												exercises.filter(
													exercise =>
														exercise.name.trim() !== '' &&
														exercise.weight.trim() !== '' &&
														exercise.reps.trim() !== '' &&
														exercise.sets.trim() !== ''
												).length > 0
									)
										? 'bg-[#E3BBA1]'
										: 'bg-gray-200'
								}`}
								onPress={handleSave}
								disabled={
									(activeTab === 'exercise'
										? !exerciseTitle.trim() || !exerciseDuration.trim()
										: !workoutTitle.trim() ||
											exercises.filter(
												exercise =>
													exercise.name.trim() !== '' &&
													exercise.weight.trim() !== '' &&
													exercise.reps.trim() !== '' &&
													exercise.sets.trim() !== ''
											).length === 0) ||
									isLoading ||
									isAnalyzing
								}
							>
								<Text
									className={`text-center font-JakartaSemiBold ${
										(
											activeTab === 'exercise'
												? exerciseTitle.trim() && exerciseDuration.trim()
												: workoutTitle.trim() &&
													exercises.filter(
														exercise =>
															exercise.name.trim() !== '' &&
															exercise.weight.trim() !== '' &&
															exercise.reps.trim() !== '' &&
															exercise.sets.trim() !== ''
													).length > 0
										)
											? 'text-white'
											: 'text-gray-500'
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
