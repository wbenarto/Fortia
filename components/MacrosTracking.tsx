import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import CustomButton from './CustomButton';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import GoalSetupModal from './GoalSetupModal';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { useRouter, useFocusEffect } from 'expo-router';
import { getTodayDate } from '@/lib/dateUtils';

interface NutritionData {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	fiber: number;
	sugar: number;
	sodium: number;
	confidence: number;
	suggestions: string[];
	notes: string;
}

interface DailySummary {
	total_calories: number;
	total_protein: number;
	total_carbs: number;
	total_fats: number;
	total_fiber: number;
	total_sugar: number;
	total_sodium: number;
	meal_count: number;
}

interface NutritionGoals {
	id: string;
	userId: string;
	dob: string;
	age: number;
	weight: number;
	targetWeight: number;
	height: number;
	gender: string;
	activityLevel: string;
	fitnessGoal: string;
	daily_calories: number;
	daily_protein: number;
	daily_carbs: number;
	daily_fats: number;
	bmr: number;
	tdee: number;
	createdAt: string;
	updatedAt: string;
}

// Calculate average macro goals based on age and gender
const calculateAgeBasedMacros = (age: number, gender: string) => {
	// Base calorie needs by age group (average for moderate activity)
	let baseCalories = 2000; // Default for adults

	if (age < 19) {
		baseCalories = gender === 'male' ? 2400 : 2000; // Teenagers
	} else if (age >= 19 && age < 30) {
		baseCalories = gender === 'male' ? 2400 : 2000; // Young adults
	} else if (age >= 30 && age < 50) {
		baseCalories = gender === 'male' ? 2200 : 1800; // Middle-aged adults
	} else if (age >= 50 && age < 65) {
		baseCalories = gender === 'male' ? 2000 : 1600; // Older adults
	} else {
		baseCalories = gender === 'male' ? 1800 : 1400; // Seniors
	}

	// Standard macro distribution for general health
	const protein = Math.round((baseCalories * 0.25) / 4); // 25% of calories
	const carbs = Math.round((baseCalories * 0.45) / 4); // 45% of calories
	const fats = Math.round((baseCalories * 0.3) / 9); // 30% of calories

	return {
		daily_calories: baseCalories,
		daily_protein: protein,
		daily_carbs: carbs,
		daily_fats: fats,
	};
};

interface MacrosTrackingProps {
	onMealLogged?: () => void;
}

const MacrosTracking = forwardRef<{ refresh: () => void }, MacrosTrackingProps>(
	({ onMealLogged }, ref) => {
		const [addMealModal, setAddMealModal] = useState(false);
		const [goalSetupModal, setGoalSetupModal] = useState(false);
		const [foodName, setFoodName] = useState('');
		const [portionSize, setPortionSize] = useState('');
		const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
		const [isAnalyzing, setIsAnalyzing] = useState(false);
		const [isSaving, setIsSaving] = useState(false);
		const [error, setError] = useState('');
		const [mealType, setMealType] = useState('snack');
		const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
		const [isLoadingSummary, setIsLoadingSummary] = useState(false);
		const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
		const [isLoadingGoals, setIsLoadingGoals] = useState(false);
		const [fallbackGoals, setFallbackGoals] = useState<{
			daily_calories: number;
			daily_protein: number;
			daily_carbs: number;
			daily_fats: number;
		} | null>(null);
		const [rateLimitInfo, setRateLimitInfo] = useState<{
			used: number;
			remaining: number;
		} | null>(null);

		const { user } = useUser();
		const router = useRouter();

		// Fetch daily summary and nutrition goals on component mount
		useEffect(() => {
			if (user?.id) {
				fetchDailySummary();
				fetchNutritionGoals();
			}
		}, [user?.id]);

		// Refresh data when screen comes into focus (e.g., when navigating back from meals tab)
		useFocusEffect(
			React.useCallback(() => {
				if (user?.id) {
					// Add a small delay to ensure the screen is fully focused
					const timer = setTimeout(() => {
						fetchDailySummary();
						fetchNutritionGoals();
					}, 100);

					return () => clearTimeout(timer);
				}
			}, [user?.id])
		);

		// Create a callback function that refreshes daily summary
		const refreshDailySummary = () => {
			fetchDailySummary();
		};

		// Expose the refresh function to parent component via ref
		useImperativeHandle(ref, () => ({
			refresh: () => {
				fetchDailySummary();
			},
		}));

		const fetchNutritionGoals = async () => {
			if (!user?.id) return;

			setIsLoadingGoals(true);
			try {
				const response = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
					method: 'GET',
				});

				if (response.success && response.data) {
					setNutritionGoals(response.data);
				} else {
					// If no goals set, calculate fallback based on user age
					// Try to get user age from profile or use default
					const userAge = (user?.publicMetadata?.age as number) || 25; // Default to 25 if not available
					const userGender = (user?.publicMetadata?.gender as string) || 'other';
					const fallback = calculateAgeBasedMacros(userAge, userGender);
					setFallbackGoals(fallback);
				}
			} catch (error) {
				console.error('Failed to fetch nutrition goals:', error);
				// Set fallback goals on error
				const userAge = (user?.publicMetadata?.age as number) || 25;
				const userGender = (user?.publicMetadata?.gender as string) || 'other';
				const fallback = calculateAgeBasedMacros(userAge, userGender);
				setFallbackGoals(fallback);
			} finally {
				setIsLoadingGoals(false);
			}
		};

		const fetchDailySummary = async () => {
			if (!user?.id) return;

			setIsLoadingSummary(true);
			try {
				// Use user's local timezone for today's date
				const today = getTodayDate();
				const response = await fetchAPI(
					`/(api)/meals?clerkId=${user.id}&date=${today}&summary=true`,
					{
						method: 'GET',
					}
				);

				if (response.success) {
					setDailySummary(response.data);
				} else {
					// If no meals logged, set empty summary
					setDailySummary({
						total_calories: 0,
						total_protein: 0,
						total_carbs: 0,
						total_fats: 0,
						total_fiber: 0,
						total_sugar: 0,
						total_sodium: 0,
						meal_count: 0,
					});
				}
			} catch (error) {
				console.error('Failed to fetch daily summary:', error);
				// Set empty summary on error
				setDailySummary({
					total_calories: 0,
					total_protein: 0,
					total_carbs: 0,
					total_fats: 0,
					total_fiber: 0,
					total_sugar: 0,
					total_sodium: 0,
					meal_count: 0,
				});
			} finally {
				setIsLoadingSummary(false);
			}
		};

		const handleAddMealModal = () => {
			setAddMealModal(!addMealModal);
			if (!addMealModal) {
				// Reset state when opening modal
				setFoodName('');
				setPortionSize('');
				setNutritionData(null);
				setError('');
				setMealType('snack');
			} else {
				// Refresh daily summary when closing modal
				fetchDailySummary();
			}
		};

		const analyzeFood = async () => {
			if (!foodName.trim()) {
				setError('Please enter a food name');
				return;
			}

			setIsAnalyzing(true);
			setError('');

			try {
				console.log('Analyzing food:', { foodName, portionSize });

				// Use direct fetch to get detailed error information
				const response = await fetch('/(api)/meal-analysis', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						foodDescription: foodName,
						portionSize: portionSize,
						userId: user?.id,
					}),
				});

				console.log('Meal analysis response status:', response.status);
				console.log(
					'Meal analysis response headers:',
					Object.fromEntries(response.headers.entries())
				);

				const data = await response.json();
				console.log('Meal analysis response data:', data);

				if (response.ok && data.success) {
					setNutritionData(data.data);

					// Show rate limit info if available
					if (data.rateLimitInfo) {
						setRateLimitInfo(data.rateLimitInfo);
					}
				} else {
					let errorMessage =
						data.error || data.details || `HTTP ${response.status}: Failed to analyze food`;

					// Handle rate limit errors specifically
					if (response.status === 429 && data.rateLimitInfo) {
						errorMessage = `Daily limit reached (${data.rateLimitInfo.used}/20 used). You can analyze 20 meals per day. Limit resets daily.`;
					}

					setError(errorMessage);
					console.error('Meal analysis API error:', { status: response.status, data });
				}
			} catch (error) {
				console.error('Food analysis network error:', error);
				setError('Network error. Please try again.');
			} finally {
				setIsAnalyzing(false);
			}
		};

		const checkUserExists = async () => {
			if (!user?.id) {
				console.error('No user ID available');
				return false;
			}

			try {
				console.log('Checking if user exists for clerkId:', user.id);

				const response = await fetch(`/(api)/user?clerkId=${user.id}`);
				console.log('User check response status:', response.status);

				const data = await response.json();
				console.log('User check response data:', data);

				const userExists = response.ok && data.success && data.data;
				console.log('User exists in database:', userExists);

				return userExists;
			} catch (error) {
				console.error('User check error:', error);
				return false;
			}
		};

		const handleSaveMeal = async () => {
			if (!nutritionData || !user?.id) {
				console.error('Missing nutritionData or user.id:', {
					nutritionData: !!nutritionData,
					userId: user?.id,
				});
				setError('Missing data. Please try again.');
				return;
			}

			setIsSaving(true);
			try {
				// Check if user exists in database first
				const userExists = await checkUserExists();
				if (!userExists) {
					setError(
						'Please complete your profile setup first. Go to Settings > Edit Profile to continue.'
					);
					console.error('User does not exist in database for clerkId:', user.id);
					return;
				}

				// Validate nutrition data before sending
				const validatedNutritionData = {
					calories: Math.max(0, Number(nutritionData.calories) || 0),
					protein: Math.max(0, Number(nutritionData.protein) || 0),
					carbs: Math.max(0, Number(nutritionData.carbs) || 0),
					fats: Math.max(0, Number(nutritionData.fats) || 0),
					fiber: Math.max(0, Number(nutritionData.fiber) || 0),
					sugar: Math.max(0, Number(nutritionData.sugar) || 0),
					sodium: Math.max(0, Number(nutritionData.sodium) || 0),
					confidence: Math.min(1, Math.max(0, Number(nutritionData.confidence) || 0.5)),
				};

				console.log('Validated nutrition data:', validatedNutritionData);

				// Validate required fields
				if (!foodName.trim()) {
					setError('Food name is required');
					return;
				}

				if (!portionSize.trim()) {
					setError('Portion size is required');
					return;
				}

				// Validate meal type
				const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
				const validatedMealType = validMealTypes.includes(mealType) ? mealType : 'snack';

				console.log('Meal type validation:', { original: mealType, validated: validatedMealType });

				const mealData = {
					clerkId: user.id,
					foodName: foodName.trim(),
					portionSize: portionSize.trim(),
					calories: validatedNutritionData.calories,
					protein: validatedNutritionData.protein,
					carbs: validatedNutritionData.carbs,
					fats: validatedNutritionData.fats,
					fiber: validatedNutritionData.fiber,
					sugar: validatedNutritionData.sugar,
					sodium: validatedNutritionData.sodium,
					confidenceScore: validatedNutritionData.confidence,
					mealType: validatedMealType,
				};

				console.log('Saving meal with data:', mealData);
				console.log('User ID being used:', user.id);
				console.log('Nutrition data validation:', {
					calories: typeof nutritionData.calories,
					protein: typeof nutritionData.protein,
					carbs: typeof nutritionData.carbs,
					fats: typeof nutritionData.fats,
					fiber: typeof nutritionData.fiber,
					sugar: typeof nutritionData.sugar,
					sodium: typeof nutritionData.sodium,
					confidence: typeof nutritionData.confidence,
				});

				// Use direct fetch to get detailed error information
				const response = await fetch('/(api)/meals', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(mealData),
				});

				console.log('Meal save response status:', response.status);
				console.log('Meal save response headers:', Object.fromEntries(response.headers.entries()));

				const data = await response.json();
				console.log('Meal save response data:', data);

				if (response.ok && data.success) {
					handleAddMealModal(); // Close modal
					// Refresh daily summary to update nutrition display
					await fetchDailySummary();
					// Notify parent component to refresh meals list
					if (onMealLogged) {
						onMealLogged();
					}
				} else {
					const errorMessage =
						data.error || data.details || `HTTP ${response.status}: Failed to save meal`;
					setError(errorMessage);
					console.error('Meal save API error:', { status: response.status, data });
				}
			} catch (error) {
				console.error('Save meal network error:', error);
				setError('Failed to save meal. Please try again.');
			} finally {
				setIsSaving(false);
			}
		};

		const handleGoalsSet = () => {
			fetchNutritionGoals(); // Refresh goals after setup
		};

		const getCurrentIntake = () => {
			if (dailySummary) {
				return {
					calories: dailySummary.total_calories,
					protein: dailySummary.total_protein,
					carbs: dailySummary.total_carbs,
					fats: dailySummary.total_fats,
				};
			}
			return {
				calories: 0,
				protein: 0,
				carbs: 0,
				fats: 0,
			};
		};

		const getTargetGoals = () => {
			if (nutritionGoals) {
				// Use the stored daily_calories which should already be calculated based on fitness goal
				// But also provide a fallback calculation in case the stored value needs updating
				let calorieTarget = nutritionGoals.daily_calories;

				// If we have TDEE and fitness goal, we can double-check the calculation
				if (nutritionGoals.tdee && nutritionGoals.fitnessGoal) {
					let calculatedTarget;
					switch (nutritionGoals.fitnessGoal) {
						case 'lose_weight':
							calculatedTarget = Math.round(nutritionGoals.tdee * 0.8); // 20% deficit
							break;
						case 'gain_muscle':
						case 'improve_fitness':
							calculatedTarget = Math.round(nutritionGoals.tdee * 0.9); // 10% deficit
							break;
						case 'maintain':
							calculatedTarget = Math.round(nutritionGoals.tdee); // No deficit
							break;
						default:
							calculatedTarget = Math.round(nutritionGoals.tdee);
					}

					// Use the calculated target if it's different from stored (in case of updates)
					if (calculatedTarget !== nutritionGoals.daily_calories) {
						calorieTarget = calculatedTarget;
					}
				}

				const goals = {
					calories: calorieTarget,
					protein: Math.round(nutritionGoals.daily_protein),
					carbs: Math.round(nutritionGoals.daily_carbs),
					fats: Math.round(nutritionGoals.daily_fats),
				};
				return goals;
			}
			if (fallbackGoals) {
				return {
					calories: fallbackGoals.daily_calories,
					protein: Math.round(fallbackGoals.daily_protein),
					carbs: Math.round(fallbackGoals.daily_carbs),
					fats: Math.round(fallbackGoals.daily_fats),
				};
			}
			// Ultimate fallback
			const defaultGoals = {
				calories: 2000,
				protein: 125,
				carbs: 225,
				fats: 67,
			};
			return defaultGoals;
		};

		const currentData = getCurrentIntake();
		const targetGoals = getTargetGoals();
		const caloriesPercentage = Math.round((currentData.calories / targetGoals.calories) * 100);

		// Calculate macro percentages
		const proteinPercentage = Math.round((currentData.protein / targetGoals.protein) * 100);
		const carbsPercentage = Math.round((currentData.carbs / targetGoals.carbs) * 100);
		const fatsPercentage = Math.round((currentData.fats / targetGoals.fats) * 100);

		return (
			<View className="w-full">
				<View className="flex flex-row justify-between items-center px-4">
					<Text className="font-JakartaSemiBold text-lg">Today's Nutrition</Text>
					<View className="flex flex-row w-24  items-center ">
						<TouchableOpacity
							onPress={handleAddMealModal}
							className="bg-[#E3BBA1] w-full px-3 py-1 rounded-full"
						>
							<Text className="text-white text-center text-xs font-JakartaSemiBold">Log Meal</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View className="px-4 py-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
					<View className="pb-4 flex flex-row justify-between items-end ">
						<View>
							<Text className="mb-2 text-[#64748B]">Calories consumed</Text>
							<View className="flex flex-row items-end">
								<Text className="font-JakartaBold text-3xl">
									{isLoadingSummary ? '...' : Number(currentData.calories).toLocaleString()}
								</Text>
								<Text className="text-[#64748B]">
									{' '}
									/{targetGoals !== null ? targetGoals.calories.toLocaleString() : ''}
								</Text>
							</View>
						</View>
						<View className="w-16 h-16 rounded-xl flex justify-center items-center border-[2px] border-[#E3BBA1] border-solid">
							<Text className="text-xl text-white font-JakartaBold text-[#E3BBA1]">
								{isLoadingSummary ? '...' : caloriesPercentage}%
							</Text>
						</View>
					</View>
					<View className="flex flex-row justify-between">
						<View className="w-[32%] h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<View className="w-2 h-2 bg-blue-300 rounded-full"></View>
								<Text className="text-xs text-[#64748B]">Protein</Text>
							</View>
							<View>
								<Text>
									{isLoadingSummary ? '...' : Math.round(currentData.protein)}g{' '}
									<Text className="text-xs text-[#64748B]"> / {targetGoals.protein}g</Text>
								</Text>
							</View>
						</View>
						<View className="w-[32%] h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<View className="w-2 h-2 bg-yellow-300 rounded-full"></View>
								<Text className="text-xs text-[#64748B]">Carbs</Text>
							</View>
							<View>
								<Text>
									{isLoadingSummary ? '...' : Math.round(currentData.carbs)}g{' '}
									<Text className="text-xs text-[#64748B]"> / {targetGoals.carbs}g</Text>
								</Text>
							</View>
						</View>
						<View className="w-[32%] h-20 rounded-2xl px-3 flex justify-center  border-solid border-[1px] border-[#F1F5F9]">
							<View className="flex flex-row gap-2 mb-2 items-center">
								<View className="w-2 h-2 bg-red-300 rounded-full"></View>
								<Text className="text-xs text-[#64748B]">Fat</Text>
							</View>
							<View>
								<Text>
									{isLoadingSummary ? '...' : Math.round(currentData.fats)}g{' '}
									<Text className="text-xs text-[#64748B]"> / {targetGoals.fats}g</Text>
								</Text>
							</View>
						</View>
					</View>

					{/* Meal Count Display */}
					{dailySummary && dailySummary.meal_count > 0 && (
						<TouchableOpacity
							onPress={() => router.push('/(root)/(tabs)/meal')}
							className="mt-4 p-3 bg-gray-50 rounded-lg active:bg-gray-100"
						>
							<View className="flex flex-row items-center justify-center">
								<Text className="text-center text-sm text-gray-600">
									{dailySummary.meal_count} meal{dailySummary.meal_count !== 1 ? 's' : ''} logged
									today
								</Text>
								<Ionicons name="chevron-forward" size={16} color="#6B7280" />
							</View>
						</TouchableOpacity>
					)}

					{/* Fallback Goals Notice */}
					{!nutritionGoals && fallbackGoals && (
						<View className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<Text className="text-center text-sm text-yellow-700">
								Using average nutrition goals. Set personalized goals for better tracking.
							</Text>
						</View>
					)}

					{/* Goal Setup Modal */}
					<GoalSetupModal
						isVisible={goalSetupModal}
						onClose={() => setGoalSetupModal(false)}
						onGoalsSet={handleGoalsSet}
					/>

					<ReactNativeModal
						className=" w-full p-0 m-0 mt-20 rounded-lg"
						isVisible={addMealModal}
						onBackdropPress={() => setAddMealModal(false)}
					>
						<ScrollView className="bg-white px-4 rounded-md py-6">
							<View className="flex flex-row justify-between items-center mb-6">
								<Text className="text-xl font-JakartaSemiBold">Log Your Meal</Text>
								<TouchableOpacity onPress={() => setAddMealModal(false)}>
									<Ionicons name="close" size={24} color="black" />
								</TouchableOpacity>
							</View>

							<View className="flex mx-auto w-full justify-center mb-4">
								<InputField
									label="Food Name"
									className="rounded-sm"
									labelClassName="text-xs text-black font-JakartaSemiBold"
									placeholder="e.g. Chicken Breast or In-N-Out Double Double"
									value={foodName}
									onChangeText={setFoodName}
								/>
							</View>

							<View className="flex mx-auto w-full justify-center mb-4">
								<InputField
									label="Amount"
									className="rounded-sm"
									labelClassName="text-xs text-black font-JakartaSemiBold"
									placeholder="e.g. 100g or 1 cup or 1 serving"
									value={portionSize}
									onChangeText={setPortionSize}
								/>
							</View>

							{/* Re-analyze Button - moved here */}
							{nutritionData && (
								<View className="mb-6">
									<TouchableOpacity
										onPress={analyzeFood}
										disabled={isAnalyzing}
										className={`py-3 px-4 rounded-lg border-2 ${
											isAnalyzing ? 'bg-gray-200 border-gray-300' : 'bg-white border-[#E3BBA1]'
										}`}
									>
										<View className="flex flex-row items-center justify-center">
											{isAnalyzing ? (
												<ActivityIndicator size="small" color="#E3BBA1" />
											) : (
												<Ionicons name="refresh" size={16} color="#E3BBA1" />
											)}
											<Text
												className={`ml-2 font-JakartaSemiBold ${
													isAnalyzing ? 'text-gray-500' : 'text-[#E3BBA1]'
												}`}
											>
												{isAnalyzing ? 'Re-analyzing...' : 'Re-analyze with AI'}
											</Text>
										</View>
									</TouchableOpacity>
									<Text className="text-xs text-gray-500 text-center mt-1">
										Adjust food name or portion size above, then tap to re-analyze
									</Text>
								</View>
							)}
							{/* Rate Limit Display */}
							{rateLimitInfo && (
								<View className="px-4 mb-4 ">
									<View className="bg-blue-50 border border-blue-200 rounded-lg p-2">
										<Text className="text-xs text-blue-700 text-center">
											Meal analysis: {rateLimitInfo.used}/20 used today ({rateLimitInfo.remaining}{' '}
											remaining)
										</Text>
									</View>
								</View>
							)}
							{/* Meal Type Selection */}
							<View className="mb-6">
								<Text className="text-xs text-black font-JakartaSemiBold mb-2">Meal Type</Text>
								<View className="flex flex-row gap-2">
									{['breakfast', 'lunch', 'dinner', 'snack'].map(type => (
										<TouchableOpacity
											key={type}
											onPress={() => setMealType(type)}
											className={`px-3 py-2 rounded-full border ${
												mealType === type
													? 'bg-[#E3BBA1] border-[#E3BBA1]'
													: 'bg-white border-gray-300'
											}`}
										>
											<Text
												className={`text-xs capitalize ${
													mealType === type ? 'text-white' : 'text-gray-600'
												}`}
											>
												{type}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>

							{error ? <Text className="text-red-500 text-center mb-4">{error}</Text> : null}

							{!nutritionData && !isAnalyzing && (
								<View className="flex justify-center items-center mb-6">
									<TouchableOpacity
										className="rounded-full bg-[#E3BBA1] w-20 h-20 p-4 flex justify-center items-center"
										onPress={analyzeFood}
										disabled={isAnalyzing}
									>
										<Ionicons name="aperture-sharp" size={36} color="white" />
									</TouchableOpacity>
									<Text className="text-center mt-2 text-sm text-gray-600">
										Tap to analyze meal
									</Text>
								</View>
							)}

							{isAnalyzing && (
								<View className="flex justify-center items-center mb-6">
									<ActivityIndicator size="large" color="#E3BBA1" />
									<Text className="text-center mt-2 text-sm text-gray-600">
										Analyzing nutrition data...
									</Text>
								</View>
							)}

							{nutritionData && (
								<View className="mb-6">
									<Text className="text-lg font-JakartaSemiBold mb-4 text-center">
										Nutrition Analysis
									</Text>

									<View className="bg-gray-50 p-4 rounded-lg mb-4">
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Calories:</Text>
											<Text>{nutritionData.calories} kcal</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Protein:</Text>
											<Text>{nutritionData.protein}g</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Carbs:</Text>
											<Text>{nutritionData.carbs}g</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Fat:</Text>
											<Text>{nutritionData.fats}g</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Fiber:</Text>
											<Text>{nutritionData.fiber}g</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Sugar:</Text>
											<Text>{nutritionData.sugar}g</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Sodium:</Text>
											<Text>{nutritionData.sodium}mg</Text>
										</View>
										<View className="flex flex-row justify-between mb-2">
											<Text className="font-JakartaSemiBold">Confidence:</Text>
											<Text>{(nutritionData.confidence * 100).toFixed(0)}%</Text>
										</View>
									</View>

									{nutritionData.notes && (
										<View className="mb-4">
											<Text className="text-sm text-gray-600">{nutritionData.notes}</Text>
										</View>
									)}

									{nutritionData.suggestions.length > 0 && (
										<View className="mb-4">
											<Text className="font-JakartaSemiBold mb-2">Similar foods:</Text>
											<Text className="text-sm text-gray-600">
												{nutritionData.suggestions.join(', ')}
											</Text>
										</View>
									)}

									<CustomButton
										onPress={isSaving ? () => {} : handleSaveMeal}
										title={isSaving ? 'Saving...' : 'Save Meal'}
									/>
								</View>
							)}
						</ScrollView>
					</ReactNativeModal>
				</View>
			</View>
		);
	}
);

export default MacrosTracking;
