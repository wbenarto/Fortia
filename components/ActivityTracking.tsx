import { useUser } from '@clerk/clerk-expo';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewWorkoutModal from '@/components/NewWorkoutModal';
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
import ActivityRow from './ActivityRow';
import ActivitiesSection from './ActivitiesSection';
import MuscleHeatmap from './workout/MuscleHeatmap';
import { iconForActivityName, useActivityTypes } from '@/lib/activityTypes';
import { router } from 'expo-router';
import { SCREEN_BG } from '@/lib/theme';

const eyebrowStyle = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

interface ActivityTrackingProps {
	refreshTrigger?: number;
	onActivityLogged?: () => void;
}

const ActivityTracking = ({ refreshTrigger = 0, onActivityLogged }: ActivityTrackingProps) => {
	const [nutritionGoals, setNutritionGoals] = useState<any>(null);
	const [stepData, setStepData] = useState<any>(null);
	// Step sync bookkeeping in a ref: the focus refetch callback is memoized, so state
	// read there is stale — that made every run re-upload, and the upload's activity
	// write triggered another refetch (endless "calories burned" reloads).
	const stepsSync = React.useRef({
		lastRun: 0,
		inFlight: false,
		syncedSteps: null as number | null, // last step count known to be on the backend
	});
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
	const activityTypes = useActivityTypes();
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
				stepsSync.current.syncedSteps = Number(response.data[0].steps) || 0;
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

		// Debounce (5 s) and never run two syncs at once
		const sync = stepsSync.current;
		const now = Date.now();
		if (sync.inFlight || now - sync.lastRun < 5000) {
			return;
		}
		sync.lastRun = now;
		sync.inFlight = true;
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

				// Only upload when the step count actually changed
				const currentBackendSteps = sync.syncedSteps ?? 0;
				if (todayStepData.steps !== currentBackendSteps) {
					sync.syncedSteps = todayStepData.steps;
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
		} finally {
			sync.inFlight = false;
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

	// Refresh data when screen comes into focus, if anything changed since last time
	useRefetchOnFocus(
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
		}, [user?.id, healthKitStatus?.isAuthorized]),
		`${user?.id ?? ''}|${healthKitStatus?.isAuthorized ?? ''}`
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
			let apiUrl = `/api/workouts?clerkId=${user.id}&sessionId=${sessionId}`;
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

	// Manual activities, minus the BMR / daily-steps rows that are already counted separately
	const loggedActivities = activities.filter(activity => {
		const description = (activity.activity_description || '').toLowerCase();
		return !description.includes('basal metabolic rate') && !description.includes('daily steps');
	});
	const exerciseTotalCalories = activitiesCalories + exercisesCalories;
	const exerciseCount = scheduledExercises.length + loggedActivities.length;
	const stepsEnabled = !!healthKitStatus?.isAuthorized;

	const goalPct = storedTDEE > 0 ? (totalCaloriesBurned / storedTDEE) * 100 : 0;
	const goalReached = storedTDEE > 0 && totalCaloriesBurned >= storedTDEE;
	const barScale = Math.max(storedTDEE, totalCaloriesBurned) || 1;
	const sources = [
		{ key: 'resting', label: 'Resting', value: storedBMR, color: '#E3BBA1' },
		{ key: 'steps', label: 'Steps', value: stepCalories, color: '#8FA9BA' },
		{ key: 'exercise', label: 'Exercise', value: exerciseTotalCalories, color: '#7DB88A' },
	];

	return (
		<View className="w-full px-6 pt-2">
			<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
				{`Today · ${new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`}
			</Text>
			<Text className="font-JakartaBold text-[28px] text-[#262135] mt-1">Activity</Text>

			<MuscleHeatmap />

			<View className="flex-row items-end justify-between mt-6">
				<View>
					<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
						Burned
					</Text>
					<View className="flex-row items-baseline mt-1">
						<Text className="font-JakartaExtraBold text-[36px] text-[#262135]">
							{isLoading ? '...' : Math.round(totalCaloriesBurned).toLocaleString()}
						</Text>
						<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">
							{storedTDEE > 0 ? `/ ${Math.round(storedTDEE).toLocaleString()} cal` : 'cal'}
						</Text>
					</View>
				</View>
				{storedTDEE > 0 && !isLoading && (
					<View
						className="flex-row items-center rounded-full px-2.5 py-1"
						style={{ backgroundColor: goalReached ? '#7DB88A26' : '#F1F1F1' }}
					>
						{goalReached && (
							<Ionicons name="sparkles" size={11} color="#5f9a6c" style={{ marginRight: 4 }} />
						)}
						<Text className="text-[10px] font-JakartaBold text-[#262135]">
							{goalReached ? 'Goal reached' : `${Math.round(goalPct)}% of daily burn`}
						</Text>
					</View>
				)}
			</View>

			{/* Burn toward TDEE, one segment per source. Scales past 100% so overage stays visible. */}
			<View className="h-1.5 rounded-full bg-[#EEEEEE] overflow-hidden flex-row mt-4">
				{sources
					.filter(source => source.value > 0)
					.map((source, i, arr) => (
						<View
							key={source.key}
							style={{
								width: `${(source.value / barScale) * 100}%`,
								backgroundColor: source.color,
								borderRightWidth: i < arr.length - 1 ? 2 : 0,
								borderColor: SCREEN_BG,
							}}
						/>
					))}
			</View>

			{/* columnGap, not NativeWind's gap-*: v2 fakes gap with a negative margin */}
			<View className="flex-row items-stretch mt-6" style={{ columnGap: 20 }}>
				{sources.map(source => (
					<View key={source.key} className="flex-1">
						<View className="flex-row items-center">
							<View
								className="w-1.5 h-1.5 rounded-full mr-1.5"
								style={{ backgroundColor: source.color }}
							/>
							<Text
								className="text-[10px] font-JakartaSemiBold text-[#574F47]"
								style={eyebrowStyle}
							>
								{source.label}
							</Text>
						</View>
						<Text className="font-JakartaBold text-[15px] text-[#262135] mt-1" numberOfLines={1}>
							{isLoading || (source.key === 'steps' && !stepsEnabled)
								? '--'
								: Math.round(source.value).toLocaleString()}
							<Text className="font-JakartaMedium text-[11px] text-[#574F47]"> cal</Text>
						</Text>
						{source.key === 'resting' && (
							<Text className="font-JakartaMedium text-[11px] text-[#574F47] mt-0.5">
								BMR, at rest
							</Text>
						)}
						{source.key === 'steps' &&
							(stepsEnabled && stepData ? (
								<TouchableOpacity onPress={() => setShowHealthKitInfo(true)} hitSlop={6}>
									<Text
										className="font-JakartaMedium text-[11px] text-[#574F47] mt-0.5"
										numberOfLines={1}
									>
										{stepData.steps.toLocaleString()} / {stepData.goal.toLocaleString()} steps
									</Text>
								</TouchableOpacity>
							) : healthKitStatus?.isAvailable ? (
								<TouchableOpacity onPress={requestHealthKitAccess} hitSlop={6}>
									<Text className="font-JakartaSemiBold text-[11px] text-[#cd9c99] mt-0.5">
										Enable steps
									</Text>
								</TouchableOpacity>
							) : (
								<TouchableOpacity onPress={() => setShowHealthKitInfo(true)} hitSlop={6}>
									<Text className="font-JakartaMedium text-[11px] text-[#574F47] mt-0.5">
										Not available
									</Text>
								</TouchableOpacity>
							))}
						{source.key === 'exercise' && (
							<Text
								className="font-JakartaMedium text-[11px] text-[#574F47] mt-0.5"
								numberOfLines={1}
							>
								{scheduledExercises.length > 0
									? `${completedExercisesCount}/${scheduledExercises.length} done`
									: `${exerciseCount} logged`}
							</Text>
						)}
					</View>
				))}
			</View>

			<ActivitiesSection variant="activity" />

			<View className="flex-row items-center justify-between mt-10 mb-1">
				<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
					Exercises{exerciseCount > 0 ? `  ·  ${exerciseCount}` : ''}
				</Text>
				<TouchableOpacity
					onPress={handleWorkoutModal}
					hitSlop={8}
					className="flex-row items-center rounded-full border-[1px] border-[#E3BBA1] px-2.5 py-1"
				>
					<Ionicons name="add" size={12} color="#cd9c99" />
					<Text className="ml-0.5 font-JakartaSemiBold text-[11px] text-[#cd9c99]">Add</Text>
				</TouchableOpacity>
			</View>

			{exerciseCount === 0 ? (
				<View className="py-10 items-center">
					<View
						className="w-12 h-12 rounded-full items-center justify-center"
						style={{ backgroundColor: '#E3BBA126' }}
					>
						<Ionicons name="barbell-outline" size={22} color="#cd9c99" />
					</View>
					<Text className="font-JakartaSemiBold text-[14px] text-[#262135] mt-3">
						No exercises yet today
					</Text>
					<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-1">
						Log a workout to count it toward your burn.
					</Text>
				</View>
			) : (
				<View>
					{scheduledExercises.map((exercise, i) => (
						<ActivityRow
							key={exercise.id}
							title={exercise.name}
							subtitle={[
								exercise.workout_type === 'barbell' ? exercise.session_title : null,
								exercise.duration !== 'No duration' ? exercise.duration : null,
							]
								.filter(Boolean)
								.join('  ·  ')}
							calories={exercise.calories_burned}
							icon={exercise.workout_type === 'barbell' ? 'barbell-outline' : 'heart-outline'}
							activityIcon={
								exercise.workout_type === 'barbell'
									? undefined
									: iconForActivityName(exercise.name || '', activityTypes)
							}
							isLast={i === exerciseCount - 1}
							isCompleted={completedExercises.has(exercise.id)}
							onToggleCompletion={() =>
								toggleExerciseCompletion(exercise.id, !completedExercises.has(exercise.id))
							}
							onDelete={() => deleteScheduledExercise(exercise.id)}
							deleteLabel={exercise.name}
						/>
					))}
					{loggedActivities.map((activity, i) => {
						// Finished built workouts: open the workout instead of a plain log row
						const workoutId = activity.workout_id;
						return (
							<ActivityRow
								key={activity.id}
								title={
									workoutId
										? activity.activity_description.replace(/ workout$/, '')
										: activity.activity_description
								}
								subtitle={
									workoutId
										? `Workout${activity.workout_minutes ? `  ·  ${activity.workout_minutes} min` : ''}`
										: 'Logged activity'
								}
								calories={activity.estimated_calories}
								icon={workoutId ? 'barbell-outline' : 'walk-outline'}
								isLast={scheduledExercises.length + i === exerciseCount - 1}
								onPress={workoutId ? () => router.push(`/training/${workoutId}`) : undefined}
								onDelete={() => deleteActivity(activity.id)}
								deleteLabel={activity.activity_description}
							/>
						);
					})}
				</View>
			)}

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
							<Ionicons name="close" size={24} color="#334155" />
						</TouchableOpacity>
					</View>

					<View className="mb-6">
						<View className="flex-row items-center mb-3">
							<Ionicons name="medical" size={20} color="#E3BBA1" />
							<Text className="text-lg font-JakartaSemiBold ml-2">What is Motion & Fitness?</Text>
						</View>
						<Text className="text-gray-700 leading-6">
							Fortia uses Apple's Motion & Fitness framework to securely access your step count and
							activity data to provide personalized fitness insights and accurate calorie
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

			{/* New Workout Modal */}
			<NewWorkoutModal
				isVisible={workoutModal}
				onClose={() => setWorkoutModal(false)}
				onSaved={fetchScheduledExercises}
			/>
		</View>
	);
};

export default ActivityTracking;
