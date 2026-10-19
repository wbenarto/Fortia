import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text } from 'react-native';
import CalorieHero from './CalorieHero';
import GoalSetupModal from './GoalSetupModal';
import LogMealModal from './LogMealModal';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { useIsFocused } from '@react-navigation/native';
import { getTodayDate } from '@/lib/dateUtils';
import { useCaloriesBurnedToday } from '@/lib/useCaloriesBurnedToday';
import { useQuickLogStore } from '@/store';

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
	selectedDate?: string;
}

const barFillPct = (eaten: number, goal: number) => {
	if (!goal) return 0;
	return Math.min(100, Math.round((eaten / goal) * 100));
};

const MacroBar = ({
	label,
	eaten,
	goal,
	isLoading,
}: {
	label: string;
	eaten: number;
	goal: number;
	isLoading: boolean;
}) => {
	const over = eaten > goal;
	return (
		<View className="flex-1 justify-between">
			<Text
				className="text-[10px] font-JakartaSemiBold text-[#94897E]"
				style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
				numberOfLines={1}
			>
				{label}
			</Text>
			<Text
				className="font-JakartaBold text-[15px] text-[#262135] mt-1"
				numberOfLines={1}
				adjustsFontSizeToFit
				minimumFontScale={0.8}
			>
				{isLoading ? '...' : Math.round(eaten)}
				<Text className="font-JakartaMedium text-[11px] text-[#94897E]">
					{isLoading ? '' : ` / ${goal}g`}
				</Text>
			</Text>
			<View
				className="w-full h-[3px] rounded-full overflow-hidden mt-1.5"
				style={{ backgroundColor: '#94897E33' }}
			>
				<View
					className="h-full rounded-full"
					style={{
						width: `${barFillPct(eaten, goal)}%`,
						backgroundColor: over ? '#cd9c99' : '#E3BBA1',
					}}
				/>
			</View>
		</View>
	);
};

const MacrosTracking = forwardRef<{ refresh: () => void }, MacrosTrackingProps>(
	({ onMealLogged, selectedDate }, ref) => {
		const [addMealModal, setAddMealModal] = useState(false);
		const [goalSetupModal, setGoalSetupModal] = useState(false);
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

		const { user } = useUser();
		const viewDate = selectedDate || getTodayDate();
		const {
			totalCaloriesBurned,
			isLoading: isLoadingOut,
			refresh: refreshCaloriesOut,
		} = useCaloriesBurnedToday(user?.id, viewDate);

		const isFocused = useIsFocused();
		const quickLogPending = useQuickLogStore(s => s.pending);
		const consumeQuickLog = useQuickLogStore(s => s.consume);

		// Fetch on focus, but only when something was written since the last fetch or the
		// viewed date/user changed — covers first mount and coming back from the meal tab
		useRefetchOnFocus(
			React.useCallback(() => {
				if (user?.id) {
					// Add a small delay to ensure the screen is fully focused
					const timer = setTimeout(() => {
						fetchDailySummary();
						fetchNutritionGoals();
						refreshCaloriesOut();
					}, 100);

					return () => clearTimeout(timer);
				}
			}, [user?.id, viewDate, refreshCaloriesOut]),
			`${user?.id ?? ''}|${viewDate}`
		);

		// Create a callback function that refreshes daily summary
		const refreshDailySummary = () => {
			fetchDailySummary();
		};

		// Expose the refresh function to parent component via ref
		useImperativeHandle(ref, () => ({
			refresh: () => {
				fetchDailySummary();
				fetchNutritionGoals();
				refreshCaloriesOut();
			},
		}));

		const fetchNutritionGoals = async () => {
			if (!user?.id) return;

			setIsLoadingGoals(true);
			try {
				const response = await fetchAPI(`/api/user?clerkId=${user.id}`, {
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
				const response = await fetchAPI(
					`/api/meals?clerkId=${user.id}&date=${viewDate}&summary=true`,
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
			if (addMealModal) {
				fetchDailySummary();
			}
		};

		// Open the meal modal when the quick-log FAB requests it (once focused)
		useEffect(() => {
			if (quickLogPending === 'meal' && isFocused && !addMealModal) {
				handleAddMealModal();
				consumeQuickLog();
			}
		}, [quickLogPending, isFocused]);

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
				// daily_calories / daily_* are the single source of truth: the backend
				// recomputes and stores them from the profile + fitness goal on every
				// relevant write (onboarding, goal change, weight log). Just use them.
				return {
					calories: Math.round(nutritionGoals.daily_calories),
					protein: Math.round(nutritionGoals.daily_protein),
					carbs: Math.round(nutritionGoals.daily_carbs),
					fats: Math.round(nutritionGoals.daily_fats),
				};
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

		return (
			<View className="w-full">
				<View className="px-6 mt-4">
					<Text className="font-JakartaBold text-[18px] text-[#262135] mb-5">Nutrition</Text>
					<View className="mb-8">
						<CalorieHero
							eaten={currentData.calories}
							burned={totalCaloriesBurned}
							goal={targetGoals.calories}
							isLoading={isLoadingSummary || isLoadingOut}
						/>
					</View>

					{/* columnGap, not NativeWind's gap-*: v2 fakes gap with a negative margin */}
					<View className="flex-row items-stretch" style={{ columnGap: 20 }}>
						<MacroBar
							label="Protein"
							eaten={currentData.protein}
							goal={targetGoals.protein}
							isLoading={isLoadingSummary}
						/>
						<MacroBar
							label="Carbs"
							eaten={currentData.carbs}
							goal={targetGoals.carbs}
							isLoading={isLoadingSummary}
						/>
						<MacroBar
							label="Fat"
							eaten={currentData.fats}
							goal={targetGoals.fats}
							isLoading={isLoadingSummary}
						/>
					</View>

					{/* Fallback Goals Notice */}
					{!nutritionGoals && fallbackGoals && (
						<View className="mt-5 px-3 py-2.5 rounded-2xl" style={{ backgroundColor: '#F2D58E33' }}>
							<Text className="text-[12px] font-JakartaMedium text-[#262135]">
								Using average nutrition goals. Set personalized goals for better tracking.
							</Text>
						</View>
					)}

					<LogMealModal
						visible={addMealModal}
						date={viewDate}
						onClose={handleAddMealModal}
						onMealLogged={onMealLogged}
					/>
				</View>
			</View>
		);
	}
);

export default MacrosTracking;
