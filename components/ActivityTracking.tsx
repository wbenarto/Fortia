import { useUser } from '@clerk/clerk-expo';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import ReactNativeModal from 'react-native-modal';

import { calculateBMR, calculateTDEE } from '@/lib/bmrUtils';
import { fetchDataConsent, hasDataCollectionConsent } from '@/lib/consentUtils';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { getTodayStepData, requestHealthKitPermissions, getHealthKitStatus } from '@/lib/healthKit';

import CustomButton from './CustomButton';
import InputField from './InputField';
import SwipeableActivityCard from './SwipeableActivityCard';
import SwipeableExerciseCard from './SwipeableExerciseCard';

interface ActivityTrackingProps {
	refreshTrigger?: number;
}

const ActivityTracking = ({ refreshTrigger = 0 }: ActivityTrackingProps) => {
	const [nutritionGoals, setNutritionGoals] = useState<any>(null);
	const [stepData, setStepData] = useState<any>(null);
	const [healthKitStatus, setHealthKitStatus] = useState<any>(null);
	const [activities, setActivities] = useState<any[]>([]);
	const [scheduledExercises, setScheduledExercises] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [workoutModal, setWorkoutModal] = useState(false);
	const [exerciseName, setExerciseName] = useState('');
	const [exerciseDuration, setExerciseDuration] = useState('');
	const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null);
	const [isCalculating, setIsCalculating] = useState(false);
	const [userConsentData, setUserConsentData] = useState<any>(null);
	const { user } = useUser();

	const fetchNutritionGoals = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		try {
			const response = await fetchAPI(`/api/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				setNutritionGoals(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch nutrition goals:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch step data from backend
	const fetchStepDataFromBackend = async () => {
		if (!user?.id) return;
		try {
			const today = getTodayDate();
			const response = await fetchAPI(`/api/steps?clerkId=${user.id}&date=${today}`, {
				method: 'GET',
			});
			if (response.success && response.data && response.data.length > 0) {
				setStepData(response.data[0]);
			} else {
				setStepData(null);
			}
		} catch (error) {
			console.error('Failed to fetch step data from backend:', error);
		}
	};

	// On iPhone, fetch from device and upload to backend only if changed
	const fetchAndUploadDeviceSteps = async () => {
		if (!user?.id) return;
		try {
			const status = await getHealthKitStatus();
			setHealthKitStatus(status);

			if (status.isAvailable && status.isAuthorized) {
				let calorieParams = undefined;
				if (nutritionGoals) {
					calorieParams = {
						weight: Number(nutritionGoals.weight),
						height: Number(nutritionGoals.height),
						age: Number(nutritionGoals.age),
						gender: nutritionGoals.gender,
					};
				}
				const todayStepData = await getTodayStepData(10000, calorieParams);

				// Check if we need to update (only if step count changed)
				const currentBackendSteps = stepData?.steps || 0;
				if (todayStepData.steps !== currentBackendSteps) {
					// Upload to backend
					const today = getTodayDate();
					await fetchAPI('/api/steps', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							clerkId: user.id,
							steps: todayStepData.steps,
							goal: todayStepData.goal,
							caloriesBurned: todayStepData.caloriesBurned,
							date: today,
						}),
					});
				}
			}
		} catch (error) {
			console.error('Failed to fetch/upload device step data:', error);
		}
		// Always fetch from backend after potential upload
		await fetchStepDataFromBackend();
	};

	const requestHealthKitAccess = async () => {
		if (!hasDataCollectionConsent(userConsentData)) {
			Alert.alert(
				'Consent Required',
				'Please provide consent for data collection in your preferences.',
				[{ text: 'OK' }]
			);
			return;
		}

		try {
			const status = await requestHealthKitPermissions();
			setHealthKitStatus(status);
			if (status.isAuthorized) {
				// Refresh step data after authorization
				await fetchAndUploadDeviceSteps();
			}
		} catch (error) {
			console.error('HealthKit authorization error:', error);
			Alert.alert('Error', 'Failed to enable HealthKit access');
		}
	};

	// Fetch activities from database
	const fetchActivities = async () => {
		if (!user?.id) return;

		try {
			const today = getTodayDate();
			const response = await fetchAPI(`/api/activities?clerkId=${user.id}&date=${today}`, {
				method: 'GET',
			});

			if (response.success) {
				setActivities(response.data || []);
			} else {
				console.error('Failed to fetch activities:', response.error);
				setActivities([]);
			}
		} catch (error) {
			console.error('Failed to fetch activities:', error);
			setActivities([]);
		}
	};

	// Fetch scheduled exercises from database
	const fetchScheduledExercises = async () => {
		if (!user?.id) return;

		try {
			const today = getTodayDate();
			const response = await fetchAPI(`/api/workouts?clerkId=${user.id}&date=${today}`, {
				method: 'GET',
			});

			if (response.success) {
				// Flatten the data: create individual cards for each exercise
				const flattenedExercises: any[] = [];

				response.workouts.forEach((workout: any) => {
					if (workout.workout_type === 'exercise') {
						// Single exercise - create one card
						flattenedExercises.push({
							id: workout.id,
							name: workout.title,
							duration:
								workout.exercises.length > 0 ? workout.exercises[0].duration : 'No duration',
							workout_type: 'exercise',
							session_title: workout.title, // For single exercises, session title is the same as exercise name
							calories_burned:
								workout.exercises.length > 0 ? workout.exercises[0].calories_burned : undefined,
						});
					} else if (workout.workout_type === 'barbell') {
						// Multi-exercise session - create individual cards for each exercise
						workout.exercises.forEach((exercise: any) => {
							flattenedExercises.push({
								id: `${workout.id}-${exercise.id}`, // Unique ID for each exercise
								name: exercise.name,
								duration: exercise.duration || 'No duration',
								workout_type: 'barbell',
								session_title: workout.title, // Use the session title
								session_id: workout.id, // Keep reference to session for deletion
								calories_burned: exercise.calories_burned,
							});
						});
					}
				});

				setScheduledExercises(flattenedExercises);
			}
		} catch (error) {
			console.error('Failed to fetch scheduled exercises:', error);
		}
	};

	// Fetch nutrition goals and step data on component mount
	useEffect(() => {
		if (user?.id) {
			fetchNutritionGoals();
			fetchActivities();
			fetchScheduledExercises();
			fetchUserConsent();
		}
	}, [user?.id]);

	const fetchUserConsent = async () => {
		if (!user?.id) return;

		try {
			const consentData = await fetchDataConsent(user.id);
			setUserConsentData(consentData);

			// Only fetch step data if user has consented to data collection
			if (hasDataCollectionConsent(consentData)) {
				await fetchStepDataFromBackend();
			}
		} catch (error) {
			console.error('Failed to fetch user consent:', error);
		}
	};

	// Refresh step data when nutrition goals change (for calorie calculation)
	useEffect(() => {
		if (user?.id && nutritionGoals && hasDataCollectionConsent(userConsentData)) {
			fetchAndUploadDeviceSteps();
		}
	}, [user?.id, nutritionGoals, userConsentData]);

	// Refresh data when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchNutritionGoals();
				fetchActivities();
				fetchScheduledExercises();
				if (hasDataCollectionConsent(userConsentData)) {
					fetchStepDataFromBackend();
				}
			}
		}, [user?.id, userConsentData])
	);

	// Refresh scheduled exercises when refreshTrigger changes
	useEffect(() => {
		if (user?.id && refreshTrigger > 0) {
			console.log('Refreshing scheduled exercises due to refreshTrigger:', refreshTrigger);
			fetchScheduledExercises();
		}
	}, [refreshTrigger, user?.id]);

	// Get BMR from stored nutrition goals with fallback calculation
	const getStoredBMR = () => {
		if (!nutritionGoals) return 0;

		// Try to get BMR from database first
		const storedBMR = nutritionGoals.bmr;
		if (storedBMR && Number(storedBMR) > 0) {
			return Number(storedBMR);
		}

		// Fallback: calculate BMR if not stored
		if (
			nutritionGoals.weight &&
			nutritionGoals.height &&
			nutritionGoals.age &&
			nutritionGoals.gender
		) {
			return Math.round(
				calculateBMR(
					Number(nutritionGoals.weight),
					Number(nutritionGoals.height),
					Number(nutritionGoals.age),
					nutritionGoals.gender
				)
			);
		}

		return 0;
	};

	// Get TDEE from stored nutrition goals with fallback calculation
	const getStoredTDEE = () => {
		if (!nutritionGoals) return 0;

		// Try to get TDEE from database first
		const storedTDEE = nutritionGoals.tdee;
		if (storedTDEE && Number(storedTDEE) > 0) {
			return Number(storedTDEE);
		}

		// Fallback: calculate TDEE if not stored
		if (
			nutritionGoals.weight &&
			nutritionGoals.height &&
			nutritionGoals.age &&
			nutritionGoals.gender &&
			nutritionGoals.activity_level
		) {
			const bmr = calculateBMR(
				Number(nutritionGoals.weight),
				Number(nutritionGoals.height),
				Number(nutritionGoals.age),
				nutritionGoals.gender
			);
			return calculateTDEE(bmr, nutritionGoals.activity_level);
		}

		return 0;
	};

	const storedBMR = getStoredBMR();
	const storedTDEE = getStoredTDEE();

	// Calculate step calories with fallback
	const getStepCalories = () => {
		// First try to use stored calories from backend
		if (stepData?.calories_burned && stepData.calories_burned > 0) {
			return stepData.calories_burned;
		}

		// Fallback: calculate on frontend if we have user profile and steps
		if (stepData?.steps && nutritionGoals) {
			const { weight, height, gender } = nutritionGoals;
			if (weight && height && gender) {
				// Calculate stride length
				let strideLength;
				if (gender === 'male') {
					strideLength = (Number(height) * 0.415) / 100;
				} else {
					strideLength = (Number(height) * 0.413) / 100;
				}

				// Calculate distance and calories
				const distanceMeters = stepData.steps * strideLength;
				const distanceKm = distanceMeters / 1000;
				const caloriesPerKm = Number(weight) * 0.6;
				const calculatedCalories = Math.round(distanceKm * caloriesPerKm);

				return calculatedCalories;
			}
		}

		return 0;
	};

	const stepCalories = getStepCalories();

	// Calculate total calories from activities
	const getActivitiesCalories = () => {
		return activities.reduce((total, activity) => {
			return total + (activity.estimated_calories || 0);
		}, 0);
	};

	const activitiesCalories = getActivitiesCalories();

	// Calculate total calories from scheduled exercises
	const getExercisesCalories = () => {
		return scheduledExercises.reduce((total, exercise) => {
			return total + (exercise.calories_burned || 0);
		}, 0);
	};

	const exercisesCalories = getExercisesCalories();
	const totalCaloriesBurned = storedBMR + stepCalories + activitiesCalories + exercisesCalories;

	const handleWorkoutModal = () => {
		setWorkoutModal(!workoutModal);
		// Reset form when opening modal
		if (!workoutModal) {
			setExerciseName('');
			setExerciseDuration('');
			setEstimatedCalories(null);
		}
	};

	const estimateCalories = async () => {
		if (!exerciseName.trim() || !exerciseDuration.trim()) return;

		setIsCalculating(true);
		try {
			const response = await fetchAPI('/api/exercise-analysis', {
				method: 'POST',
				body: JSON.stringify({
					exerciseDescription: exerciseName.trim(),
					duration: exerciseDuration.trim(),
					userId: user?.id,
				}),
			});

			if (response.success && response.data) {
				// Extract calories from the exercise analysis response
				const calories = response.data.calories_burned || 0;
				setEstimatedCalories(calories);
			} else {
				let errorMessage = response.error || 'Failed to estimate calories';

				// Handle rate limit errors specifically
				if (response.status === 429 && response.rateLimitInfo) {
					errorMessage = `Daily limit reached (${response.rateLimitInfo.used}/20 used). You can analyze 20 exercises per day. Limit resets daily.`;
				}

				console.error('Failed to estimate calories:', errorMessage);
				Alert.alert('Error', errorMessage);
			}
		} catch (error) {
			console.error('Error estimating calories:', error);
		} finally {
			setIsCalculating(false);
		}
	};

	const saveActivity = async () => {
		if (!exerciseName.trim() || !exerciseDuration.trim() || !user?.id) {
			console.error('Missing required fields for saving activity');
			return;
		}

		if (!estimatedCalories) {
			console.error('Estimated calories is required before saving');
			return;
		}

		try {
			const response = await fetchAPI('/api/activities', {
				method: 'POST',
				body: JSON.stringify({
					clerkId: user.id,
					activityDescription: `${exerciseName.trim()} for ${exerciseDuration.trim()}`,
					estimatedCalories: estimatedCalories,
				}),
			});

			if (response.success) {
				// Reset form
				setExerciseName('');
				setExerciseDuration('');
				setEstimatedCalories(null);
				setWorkoutModal(false);
				// Refresh activities list
				await fetchActivities();
			} else {
				console.error('Failed to save activity:', response.error);
			}
		} catch (error) {
			console.error('Error saving activity:', error);
			console.error('Error details:', {
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});
		}
	};

	const deleteActivity = async (activityId: string) => {
		if (!user?.id) return;

		try {
			const response = await fetchAPI(`/api/activities?id=${activityId}&clerkId=${user.id}`, {
				method: 'DELETE',
			});

			if (response.success) {
				await fetchActivities(); // Refresh the activities list
			} else {
				console.error('Failed to delete activity:', response.error);
			}
		} catch (error) {
			console.error('Error deleting activity:', error);
		}
	};

	const toggleExerciseCompletion = async (exerciseId: string, isCompleted: boolean) => {
		console.log('Toggling exercise completion');
		// TODO: Implement API call to update exercise completion status
		// For now, just log the action
	};

	const deleteScheduledExercise = async (exerciseId: string) => {
		if (!user?.id) return;

		try {
			// Find the exercise to get the session_id
			const exercise = scheduledExercises.find(ex => ex.id === exerciseId);
			if (!exercise) {
				console.error('Exercise not found for deletion');
				return;
			}

			// Determine the session ID and exercise ID to delete
			let sessionId: string;
			let individualExerciseId: string | null = null;

			if (exercise.workout_type === 'barbell') {
				// For barbell exercises, extract the actual exercise ID from the compound ID
				// The ID format is "sessionId-exerciseId"
				const idParts = exerciseId.split('-');
				if (idParts.length === 2) {
					sessionId = exercise.session_id;
					individualExerciseId = idParts[1]; // The actual exercise ID
				} else {
					sessionId = exercise.session_id;
				}
			} else {
				// For single exercises, use the exercise ID directly
				sessionId = exerciseId;
			}

			if (!sessionId) {
				console.error('No session ID found for exercise:', exercise);
				Alert.alert('Error', 'Unable to delete exercise. Please try again.');
				return;
			}

			console.log('Deleting exercise');

			// Build the API URL with appropriate parameters
			let apiUrl = `/(api)/workouts?clerkId=${user.id}&sessionId=${sessionId}`;
			if (individualExerciseId) {
				apiUrl += `&exerciseId=${individualExerciseId}`;
			}

			const response = await fetchAPI(apiUrl, {
				method: 'DELETE',
			});

			if (response.success) {
				console.log('Exercise deleted successfully, refreshing data...');
				// Refresh the data instead of just removing from local state
				await fetchScheduledExercises();
			} else {
				console.error('Failed to delete scheduled exercise:', response.error);
				// Show error to user
				Alert.alert('Error', `Failed to delete exercise: ${response.error}`);
			}
		} catch (error) {
			console.error('Error deleting scheduled exercise:', error);
			// Show error to user
			Alert.alert('Error', 'Failed to delete exercise. Please try again.');
		}
	};

	return (
		<View className="w-full">
			<View className="flex flex-row justify-between items-center px-4">
				<Text className="font-JakartaSemiBold text-lg">Activity Summary</Text>
				<View className="flex flex-row  w-28 items-center ">
					<TouchableOpacity
						onPress={handleWorkoutModal}
						className="bg-[#E3BBA1] w-full px-3 py-1 rounded-full"
					>
						<Text className="text-white text-center text-xs font-JakartaSemiBold">
							Log Exercise
						</Text>
					</TouchableOpacity>
				</View>
			</View>
			<View className=" pb-6 px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-end ">
					<View>
						<View className="flex flex-row items-center gap-2 mb-2">
							<Text className=" text-[#64748B]">Calories Burned</Text>
							{totalCaloriesBurned >= storedTDEE && storedTDEE > 0 ? (
								<View className="flex flex-row items-center  rounded-lg px-2 border-[1px] border-[#9ED5A0] py-1">
									<Ionicons name="sparkles-outline" size={14} color="#9ED5A0" />
									<Text className="text-xs font-JakartaSemiBold ml-1 text-[#9ED5A0]">
										Goal reached!
									</Text>
								</View>
							) : (
								<Text>{''}</Text>
							)}
						</View>

						<View className="flex flex-row items-end">
							<Text className="font-JakartaBold text-3xl">
								{isLoading ? '...' : totalCaloriesBurned.toLocaleString()}
							</Text>
							<Text className="text-[#64748B]"> /{storedTDEE.toLocaleString()}</Text>
						</View>
					</View>
					<View className="w-16 h-16 rounded-xl flex justify-center items-center border-[2px] border-[#9ED5A0] border-solid">
						{totalCaloriesBurned >= storedTDEE ? (
							<Ionicons name="checkmark-sharp" size={30} color="#9ED5A0" />
						) : (
							<Text className="text-lg text-[#9ED5A0] font-JakartaBold ">
								{storedTDEE > 0 ? Math.round((totalCaloriesBurned / storedTDEE) * 100) : 0}%
							</Text>
						)}
					</View>
				</View>
				<View className="flex gap-2 justify-between">
					{/* BMR Card - First on the list */}
					{nutritionGoals && (
						<View className="h-20 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<Ionicons name="heart-outline" size={14} color="#5A556B" />
								<Text className="text-xs text-[#64748B]">Basal Metabolic Rate</Text>
							</View>
							<View className="flex flex-row justify-between items-center">
								<Text className="text-lg font-JakartaBold">
									{isLoading
										? '...'
										: `${Math.round(Number(nutritionGoals.bmr || 0)).toLocaleString()} kcal/day`}
								</Text>
								<View className="flex flex-row gap-2">
									<Ionicons name="information-circle-outline" size={14} color="#5A556B" />
									<Text className="text-[#64748B] text-xs">At rest</Text>
								</View>
							</View>
						</View>
					)}

					<View className=" h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
						<View className="flex flex-row gap-2 mb-2 items-center">
							<Ionicons name="footsteps-outline" size={14} color="#5A556B" />
							<Text className="text-xs text-[#64748B]">Steps</Text>
							{!hasDataCollectionConsent(userConsentData) ? (
								<TouchableOpacity
									onPress={() =>
										Alert.alert(
											'Consent Required',
											'Please provide consent for data collection in your preferences.',
											[{ text: 'OK' }]
										)
									}
									className="bg-red-500 px-2 py-1 rounded-lg"
								>
									<Text className="text-white text-xs">Consent Required</Text>
								</TouchableOpacity>
							) : !healthKitStatus?.isAuthorized && healthKitStatus?.isAvailable ? (
								<TouchableOpacity
									onPress={requestHealthKitAccess}
									className="bg-[#E3BBA1] px-2 py-1 rounded-lg"
								>
									<Text className="text-white text-xs">Enable</Text>
								</TouchableOpacity>
							) : null}
						</View>
						<View className="flex flex-row justify-between items-center">
							<Text className="text-lg font-JakartaBold">
								{!hasDataCollectionConsent(userConsentData) ? (
									<Text className="text-xs text-[#64748B]">Consent required for step tracking</Text>
								) : stepData ? (
									<>
										{stepData.steps.toLocaleString()}{' '}
										<Text className="text-xs text-[#64748B]">
											/ {stepData.goal.toLocaleString()}
										</Text>
									</>
								) : (
									<Text className="text-xs text-[#64748B]">Enable step tracking</Text>
								)}
							</Text>
							<View className="flex flex-row gap-2">
								<SimpleLineIcons name="fire" size={14} colors="#5A556B" />
								<Text className="text-[#64748B]">
									{stepCalories > 0 ? `${stepCalories} cal` : '--'}
								</Text>
							</View>
						</View>
					</View>

					{/* Scheduled Exercises Cards */}
					{scheduledExercises.length > 0 ? (
						scheduledExercises.map((exercise, index) => (
							<SwipeableExerciseCard
								key={exercise.id}
								exercise={exercise}
								onDelete={deleteScheduledExercise}
								onToggleCompletion={toggleExerciseCompletion}
							/>
						))
					) : (
						<View className="h-20 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<Ionicons name="calendar-outline" size={14} color="#5A556B" />
								<Text className="text-xs text-[#64748B]">Scheduled Exercises</Text>
							</View>
							<View className="flex flex-row justify-between items-center">
								<Text className="text-lg font-JakartaBold text-[#64748B]">
									No exercises scheduled
								</Text>
								<View className="flex flex-row gap-2">
									<Ionicons name="time-outline" size={14} color="#5A556B" />
									<Text className="text-[#64748B]">--</Text>
								</View>
							</View>
						</View>
					)}

					{/* Activities Cards */}
					{activities.length > 0 ? (
						activities.map((activity, index) => (
							<SwipeableActivityCard
								key={activity.id}
								activity={activity}
								onDelete={deleteActivity}
							/>
						))
					) : scheduledExercises.length === 0 ? (
						<View className="h-20 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<Ionicons name="barbell-outline" size={14} color="#5A556B" />
								<Text className="text-xs text-[#64748B]">Today's Workout</Text>
							</View>
							<View className="flex flex-row justify-between items-center">
								<Text className="text-lg font-JakartaBold text-[#64748B]">
									No activities logged
								</Text>
								<View className="flex flex-row gap-2">
									<SimpleLineIcons name="fire" size={14} colors="#5A556B" />
									<Text className="text-[#64748B]">--</Text>
								</View>
							</View>
						</View>
					) : null}
				</View>

				{/* Workout Modal */}
				<ReactNativeModal
					className=" w-full h-full bg-red-100 p-0 m-0 mt-20 rounded-lg"
					isVisible={workoutModal}
					onBackdropPress={() => setWorkoutModal(false)}
				>
					<View className="bg-white w-full h-full p-6 rounded-md">
						<View className="pb-4 flex flex-row justify-between items-center">
							<Text className="text-xl text-center font-JakartaSemiBold">Log your activity</Text>
							<TouchableOpacity onPress={() => setWorkoutModal(false)}>
								<Ionicons name="close" size={24} color="black" />
							</TouchableOpacity>
						</View>

						<View className="mb-4 bg-white rounded-xl">
							<InputField
								label="Exercise Name"
								labelStyle="text-sm"
								placeholder="e.g. Morning Bike Ride, Light Run, Swimming, etc..."
								value={exerciseName}
								onChangeText={setExerciseName}
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

						{isCalculating && (
							<View className="flex justify-center items-center mb-6">
								<ActivityIndicator size="large" color="#E3BBA1" />
								<Text className="text-center mt-2 text-sm text-gray-600">
									Estimating calories burned...
								</Text>
							</View>
						)}

						{/* Re-analyze Button - appears after initial estimation */}

						<View className="mb-6">
							<TouchableOpacity
								onPress={estimateCalories}
								disabled={isCalculating || !exerciseName.trim() || !exerciseDuration.trim()}
								className={`py-3 px-4 rounded-lg border-2 ${
									isCalculating || !exerciseName.trim() || !exerciseDuration.trim()
										? 'bg-gray-200 border-gray-300'
										: 'bg-white border-[#E3BBA1]'
								}`}
							>
								<View className="flex flex-row items-center justify-center">
									{isCalculating ? (
										<ActivityIndicator size="small" color="#E3BBA1" />
									) : (
										<Ionicons name="refresh" size={16} color="#E3BBA1" />
									)}
									<Text
										className={`ml-2 font-JakartaSemiBold ${
											isCalculating || !exerciseName.trim() || !exerciseDuration.trim()
												? 'text-gray-500'
												: 'text-[#E3BBA1]'
										}`}
									>
										{isCalculating ? 'Re-analyzing...' : 'Analyze activity'}
									</Text>
								</View>
							</TouchableOpacity>
						</View>

						{estimatedCalories && (
							<View className="mb-6">
								<Text className="text-sm text-center text-[#64748B] mb-1">
									{exerciseName} for {exerciseDuration}
								</Text>
								<Text className="text-base text-center font-JakartaMedium">
									~{estimatedCalories} cal
								</Text>
							</View>
						)}

						{estimatedCalories && (
							<TouchableOpacity className="py-3 rounded-lg bg-[#E3BBA1]" onPress={saveActivity}>
								<Text className="text-center font-JakartaSemiBold text-white">Save</Text>
							</TouchableOpacity>
						)}
					</View>
				</ReactNativeModal>
			</View>
		</View>
	);
};

export default ActivityTracking;
