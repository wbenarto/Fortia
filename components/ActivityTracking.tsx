import { useUser } from '@clerk/clerk-expo';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { calculateBMR, calculateTDEE } from '@/lib/bmrUtils';
import { getUnifiedBMR } from '@/lib/unifiedBMRCalculator';
import { logDailySteps } from '@/lib/stepsLogging';
import { fetchDataConsent, hasDataCollectionConsent } from '@/lib/consentUtils';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import {
	getTodayStepData,
	requestHealthKitPermissions,
	getHealthKitStatus,
	verifyHealthKitPermissions,
} from '@/lib/healthKit';

import CustomButton from './CustomButton';
import InputField from './InputField';
import SwipeableActivityCard from './SwipeableActivityCard';
import SwipeableExerciseCard from './SwipeableExerciseCard';

interface ActivityTrackingProps {
	refreshTrigger?: number;
	onActivityLogged?: () => void;
}

const ActivityTracking = ({ refreshTrigger = 0, onActivityLogged }: ActivityTrackingProps) => {
	const [nutritionGoals, setNutritionGoals] = useState<any>(null);
	const [lastStepsFetchTime, setLastStepsFetchTime] = useState<number>(0);
	const [stepData, setStepData] = useState<any>(null);
	const [healthKitStatus, setHealthKitStatus] = useState<any>(null);
	const [activities, setActivities] = useState<any[]>([]);
	const [scheduledExercises, setScheduledExercises] = useState<any[]>([]);
	const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
	const [isLoading, setIsLoading] = useState(false);
	const [showHealthKitInfo, setShowHealthKitInfo] = useState(false);
	const [hasShownInitialPrompt, setHasShownInitialPrompt] = useState(false);

	// Save completion status to AsyncStorage
	const saveCompletionStatus = async (completedSet: Set<string>) => {
		if (!user?.id) return;
		try {
			const today = getTodayDate();
			const key = `completed_exercises_${user.id}_${today}`;
			const completedArray = Array.from(completedSet);
			await AsyncStorage.setItem(key, JSON.stringify(completedArray));
		} catch (error) {
			console.error('Failed to save completion status:', error);
		}
	};

	// Load completion status from AsyncStorage
	const loadCompletionStatus = async () => {
		if (!user?.id) return;
		try {
			const today = getTodayDate();
			const key = `completed_exercises_${user.id}_${today}`;
			const savedData = await AsyncStorage.getItem(key);
			if (savedData) {
				const completedArray = JSON.parse(savedData);
				setCompletedExercises(new Set(completedArray));
			}
		} catch (error) {
			console.error('Failed to load completion status:', error);
		}
	};
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

		// Debounce: prevent multiple calls within 5 seconds
		const now = Date.now();
		if (now - lastStepsFetchTime < 5000) {
			return;
		}
		setLastStepsFetchTime(now);
		try {
			// Only proceed if HealthKit is already authorized
			if (healthKitStatus?.isAvailable && healthKitStatus?.isAuthorized) {
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

					// Log steps to activities table (once per day)
					if (todayStepData.steps > 0) {
						try {
							const success = await logDailySteps({
								clerkId: user.id,
								steps: todayStepData.steps,
								caloriesBurned: todayStepData.caloriesBurned,
								onSuccess: () => {
									// Refresh charts when steps are logged
									onActivityLogged?.();
								},
								onError: error => {
									console.error('Steps logging failed:', error);
								},
							});

							if (success) {
								// Steps logged successfully
							}
						} catch (error) {
							console.error('Error in steps logging:', error);
						}
					}
				}
			}
		} catch (error) {
			console.error('Failed to fetch/upload device step data:', error);
		}
		// Always fetch from backend after potential upload
		await fetchStepDataFromBackend();
	};

	const requestHealthKitAccess = async () => {
		// Show detailed explanation before requesting permissions
		Alert.alert(
			'Motion & Fitness Access',
			'Fortia would like to access your step count and activity data to provide personalized fitness insights and accurate calorie calculations. This data will be used solely for your fitness tracking within the app.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Allow Access',
					onPress: async () => {
						try {
							const status = await requestHealthKitPermissions();
							setHealthKitStatus(status);

							if (status.isAuthorized) {
								// Verify permissions were actually granted
								const verifiedStatus = await verifyHealthKitPermissions();
								setHealthKitStatus(verifiedStatus);

								if (verifiedStatus.isAuthorized) {
									// Refresh step data after authorization
									await fetchAndUploadDeviceSteps();
									// Also refresh the backend step data
									await fetchStepDataFromBackend();
								} else {
									Alert.alert(
										'Permission Denied',
										'Motion & Fitness access is required for step tracking. You can enable it in Settings > Privacy & Security > Motion & Fitness > Fortia.'
									);
								}
							} else {
								Alert.alert(
									'Permission Denied',
									'Motion & Fitness access is required for step tracking. You can enable it in Settings > Privacy & Security > Motion & Fitness > Fortia.'
								);
							}
						} catch (error) {
							console.error('HealthKit authorization error:', error);
							Alert.alert('Error', 'Failed to enable HealthKit access');
						}
					},
				},
			]
		);
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
			loadCompletionStatus();
			// Check HealthKit status on mount (but don't request permissions)
			checkHealthKitStatus();
		}
	}, [user?.id]);

	// Check HealthKit status without requesting permissions
	const checkHealthKitStatus = async () => {
		try {
			const status = await getHealthKitStatus();
			setHealthKitStatus(status);
		} catch (error) {
			console.error('Error checking HealthKit status:', error);
		}
	};

	// Show initial HealthKit permission prompt on app load
	const showInitialHealthKitPrompt = async () => {
		// Only show if we haven't shown it before and HealthKit is available but not authorized
		if (!hasShownInitialPrompt && healthKitStatus?.isAvailable && !healthKitStatus?.isAuthorized) {
			// Check if we've already asked this user before
			if (!user?.id) return;

			try {
				const promptKey = `healthkit_prompt_shown_${user.id}`;
				const hasBeenAsked = await AsyncStorage.getItem(promptKey);

				if (!hasBeenAsked) {
					setHasShownInitialPrompt(true);
					// Mark that we've asked this user
					await AsyncStorage.setItem(promptKey, 'true');

					Alert.alert(
						'Enable Step Tracking',
						'Fortia can track your daily steps and activity to provide personalized fitness insights and accurate calorie calculations. This requires access to Motion & Fitness data. Would you like to enable step tracking now?',
						[
							{
								text: 'Not Now',
								style: 'cancel',
								onPress: () => {
									// User declined, they can enable later via the button
								},
							},
							{
								text: 'Enable',
								onPress: async () => {
									// User wants to enable, call the existing permission request function
									await requestHealthKitAccess();
								},
							},
						]
					);
				}
			} catch (error) {
				console.error('Error checking HealthKit prompt status:', error);
			}
		}
	};

	const fetchUserConsent = async () => {
		if (!user?.id) return;

		try {
			const consentData = await fetchDataConsent(user.id);
			setUserConsentData(consentData);

			// Only fetch step data from backend if HealthKit is authorized
			if (healthKitStatus?.isAuthorized) {
				await fetchStepDataFromBackend();
			}
		} catch (error) {
			console.error('Failed to fetch user consent:', error);
		}
	};

	// Show initial HealthKit prompt when status is checked
	useEffect(() => {
		if (healthKitStatus !== null) {
			showInitialHealthKitPrompt();
		}
	}, [healthKitStatus, hasShownInitialPrompt]);

	// Refresh step data when nutrition goals change (for calorie calculation)
	// Only auto-fetch if user has explicitly granted HealthKit permissions
	useEffect(() => {
		if (user?.id && nutritionGoals && healthKitStatus?.isAuthorized) {
			fetchAndUploadDeviceSteps();
		}
	}, [user?.id, nutritionGoals, healthKitStatus?.isAuthorized]);

	// Refresh data when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			if (user?.id) {
				fetchNutritionGoals();
				fetchActivities();
				fetchScheduledExercises();
				loadCompletionStatus(); // Reload completion status
				// Only fetch step data if HealthKit is authorized
				if (healthKitStatus?.isAuthorized) {
					fetchStepDataFromBackend();
					fetchAndUploadDeviceSteps();
				}
			}
		}, [user?.id, healthKitStatus?.isAuthorized])
	);

	// Refresh scheduled exercises when refreshTrigger changes
	useEffect(() => {
		if (user?.id && refreshTrigger > 0) {
			fetchScheduledExercises();
		}
	}, [refreshTrigger, user?.id]);

	// Get BMR using unified calculator with user's current data (memoized for performance)
	const [storedBMR, setStoredBMR] = useState(0);

	useEffect(() => {
		const fetchBMR = async () => {
			if (user?.id) {
				const bmr = await getUnifiedBMR(user.id);
				setStoredBMR(bmr);
			}
		};

		fetchBMR();
	}, [user?.id, refreshTrigger]); // Refresh when user changes or refreshTrigger updates

	// Get TDEE from stored nutrition goals with fallback calculation (memoized for performance)
	const storedTDEE = useMemo(() => {
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
	}, [
		nutritionGoals?.tdee,
		nutritionGoals?.weight,
		nutritionGoals?.height,
		nutritionGoals?.age,
		nutritionGoals?.gender,
		nutritionGoals?.activity_level,
	]);

	// Calculate step calories with fallback (memoized for performance)
	const stepCalories = useMemo(() => {
		// Only calculate calories if HealthKit is authorized
		if (!healthKitStatus?.isAuthorized) {
			return 0;
		}

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
	}, [
		healthKitStatus?.isAuthorized,
		stepData?.calories_burned,
		stepData?.steps,
		nutritionGoals?.weight,
		nutritionGoals?.height,
		nutritionGoals?.gender,
	]);

	// Calculate total calories from activities (memoized for performance)
	// Exclude BMR and Steps activities since they are already included separately
	const activitiesCalories = useMemo(() => {
		return activities.reduce((total, activity) => {
			// Skip BMR activities to avoid double counting
			if (
				activity.activity_description &&
				activity.activity_description.toLowerCase().includes('basal metabolic rate')
			) {
				return total;
			}
			// Skip Steps activities to avoid double counting
			if (
				activity.activity_description &&
				activity.activity_description.toLowerCase().includes('daily steps')
			) {
				return total;
			}
			return total + (activity.estimated_calories || 0);
		}, 0);
	}, [activities]);

	// Calculate total calories from scheduled exercises (memoized for performance)
	const exercisesCalories = useMemo(() => {
		return scheduledExercises.reduce((total, exercise) => {
			return total + (exercise.calories_burned || 0);
		}, 0);
	}, [scheduledExercises]);

	// Get count of completed exercises (memoized for performance)
	const completedExercisesCount = useMemo(() => {
		return completedExercises.size;
	}, [completedExercises]);
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
					date: getTodayDate(), // Add user's local date for proper timezone handling
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
				// Notify parent component to refresh dashboard counts
				onActivityLogged?.();
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
		// Update local state immediately for responsive UI
		setCompletedExercises(prev => {
			const newSet = new Set(prev);
			if (isCompleted) {
				newSet.add(exerciseId);
			} else {
				newSet.delete(exerciseId);
			}
			// Save to AsyncStorage
			saveCompletionStatus(newSet);
			return newSet;
		});

		// TODO: Implement API call to persist completion status to backend
		// For now, we're just managing local state with AsyncStorage
		// When you're ready to persist to backend, you can add:
		// try {
		//   const response = await fetchAPI('/api/exercise-completion', {
		//     method: 'POST',
		//     body: JSON.stringify({
		//       clerkId: user?.id,
		//       exerciseId: exerciseId,
		//       isCompleted: isCompleted,
		//       date: getTodayDate()
		//     })
		//   });
		//   if (!response.success) {
		//     console.error('Failed to update exercise completion:', response.error);
		//   }
		// } catch (error) {
		//   console.error('Error updating exercise completion:', error);
		// }
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

			// Build the API URL with appropriate parameters
			let apiUrl = `/(api)/workouts?clerkId=${user.id}&sessionId=${sessionId}`;
			if (individualExerciseId) {
				apiUrl += `&exerciseId=${individualExerciseId}`;
			}

			const response = await fetchAPI(apiUrl, {
				method: 'DELETE',
			});

			if (response.success) {
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

							<TouchableOpacity
								onPress={() => setShowHealthKitInfo(true)}
								className="flex-row items-center"
							>
								<Ionicons name="medical" size={12} color="#E3BBA1" />
								<Text className="text-xs text-[#E3BBA1] ml-1">HealthKit</Text>
							</TouchableOpacity>

							{!healthKitStatus?.isAuthorized && healthKitStatus?.isAvailable ? (
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
								{stepData && healthKitStatus?.isAuthorized ? (
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
									{stepCalories > 0 && healthKitStatus?.isAuthorized ? `${stepCalories} cal` : '--'}
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
								isCompleted={completedExercises.has(exercise.id)}
								onDelete={deleteScheduledExercise}
								onToggleCompletion={toggleExerciseCompletion}
							/>
						))
					) : (
						<View className="h-20 rounded-2xl px-3 flex justify-center border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<Ionicons name="calendar-outline" size={14} color="#5A556B" />
								<Text className="text-xs text-[#64748B]">Scheduled Exercises</Text>
								{scheduledExercises.length > 0 && (
									<View className="bg-green-100 px-2 py-1 rounded-lg">
										<Text className="text-xs text-green-700 font-JakartaSemiBold">
											{completedExercisesCount}/{scheduledExercises.length} completed
										</Text>
									</View>
								)}
							</View>
							<View className="flex flex-row justify-between items-center">
								<Text className="text-lg font-JakartaBold text-[#64748B]">
									{scheduledExercises.length > 0
										? `${scheduledExercises.length} exercises scheduled`
										: 'No exercises scheduled'}
								</Text>
								<View className="flex flex-row gap-2">
									<Ionicons name="time-outline" size={14} color="#5A556B" />
									<Text className="text-[#64748B]">
										{scheduledExercises.length > 0 ? `${completedExercisesCount} done` : '--'}
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Activities Cards */}
					{activities.filter(
						activity =>
							!activity.activity_description ||
							(!activity.activity_description.toLowerCase().includes('basal metabolic rate') &&
								!activity.activity_description.toLowerCase().includes('daily steps'))
					).length > 0 ? (
						activities
							.filter(
								activity =>
									!activity.activity_description ||
									(!activity.activity_description.toLowerCase().includes('basal metabolic rate') &&
										!activity.activity_description.toLowerCase().includes('daily steps'))
							)
							.map((activity, index) => (
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

				{/* HealthKit Info Modal */}
				<ReactNativeModal
					isVisible={showHealthKitInfo}
					onBackdropPress={() => setShowHealthKitInfo(false)}
					onBackButtonPress={() => setShowHealthKitInfo(false)}
					className="mt-32 mb-0 mx-0 "
				>
					<ScrollView className="bg-white rounded-3xl p-6 max-h-[100%] ">
						<View className="flex-row justify-between items-center mb-6">
							<Text className="text-xl font-JakartaBold">HealthKit Integration</Text>
							<TouchableOpacity onPress={() => setShowHealthKitInfo(false)}>
								<Ionicons name="close" size={24} color="#64748B" />
							</TouchableOpacity>
						</View>

						<View className="mb-6">
							<View className="flex-row items-center mb-3">
								<Ionicons name="medical" size={20} color="#E3BBA1" />
								<Text className="text-lg font-JakartaSemiBold ml-2">What is Motion & Fitness?</Text>
							</View>
							<Text className="text-gray-700 leading-6">
								Fortia uses Apple's Motion & Fitness framework to securely access your step count
								and activity data to provide personalized fitness insights and accurate calorie
								calculations.
							</Text>
						</View>

						<View className="mb-6">
							<View className="flex-row items-center mb-3">
								<Ionicons name="shield-checkmark" size={20} color="#E3BBA1" />
								<Text className="text-lg font-JakartaSemiBold ml-2">Data Security</Text>
							</View>
							<Text className="text-gray-700 leading-6">
								• Your health data is encrypted and stored securely on your device{'\n'}• We only
								access step count and basic activity data{'\n'}• Data is never shared with third
								parties without your consent{'\n'}• You can revoke access at any time in Settings
							</Text>
						</View>

						<View className="mb-6">
							<View className="flex-row items-center mb-3">
								<Ionicons name="analytics" size={20} color="#E3BBA1" />
								<Text className="text-lg font-JakartaSemiBold ml-2">How We Use Your Data</Text>
							</View>
							<Text className="text-gray-700 leading-6">
								• Track your daily step count and activity levels{'\n'}• Calculate calories burned
								from your activity{'\n'}• Provide personalized fitness recommendations{'\n'}• Sync
								data across your devices securely
							</Text>
						</View>

						<View className="mb-6">
							<View className="flex-row items-center mb-3">
								<Ionicons name="settings" size={20} color="#E3BBA1" />
								<Text className="text-lg font-JakartaSemiBold ml-2">Managing Permissions</Text>
							</View>
							<Text className="text-gray-700 leading-6">
								You can manage Motion & Fitness permissions in your device Settings {'>'} Privacy &
								Security {'>'} Motion & Fitness {'>'} Fortia.
							</Text>
						</View>

						<TouchableOpacity
							onPress={() => setShowHealthKitInfo(false)}
							className="bg-[#E3BBA1] py-3 rounded-xl mt-4 mb-20"
						>
							<Text className="text-white text-center font-JakartaSemiBold">Got it</Text>
						</TouchableOpacity>
					</ScrollView>
				</ReactNativeModal>
			</View>
		</View>
	);
};

export default ActivityTracking;
