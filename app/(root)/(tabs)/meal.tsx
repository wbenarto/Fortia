import { View, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SignedIn, useUser } from '@clerk/clerk-expo';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FoodLogCard, { type LoggedMeal, type MacroGoals } from '@/components/FoodLogCard';
import LogMealModal from '@/components/LogMealModal';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { useQuickLogStore } from '@/store';
import { SCREEN_BG } from '@/lib/theme';

const Meal = () => {
	const [meals, setMeals] = useState<LoggedMeal[]>([]);
	const [isLoadingMeals, setIsLoadingMeals] = useState(false);
	const [error, setError] = useState('');
	const [calorieGoal, setCalorieGoal] = useState<number | undefined>();
	const [macroGoals, setMacroGoals] = useState<MacroGoals | undefined>();
	const [logMealModal, setLogMealModal] = useState(false);
	// No date picker on this screen — always today, re-read on focus so it rolls over at midnight
	const [today, setToday] = useState(getTodayDate());

	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const isFocused = useIsFocused();
	const quickLogPending = useQuickLogStore(s => s.pending);
	const consumeQuickLog = useQuickLogStore(s => s.consume);

	const fetchMeals = useCallback(async (date: string = today) => {
		if (!user?.id) return;

		setIsLoadingMeals(true);
		setError('');

		try {
			const response = await fetchAPI(`/api/meals?clerkId=${user.id}&date=${date}`, {
				method: 'GET',
			});

			if (response.success) {
				setMeals(response.data || []);
			} else {
				setError('Failed to fetch meals');
				setMeals([]);
			}
		} catch (error) {
			console.error('Failed to fetch meals:', error);
			setError('Failed to fetch meals');
			setMeals([]);
		} finally {
			setIsLoadingMeals(false);
		}
	}, [user?.id, today]);

	// daily_calories is recomputed server-side on every profile/goal write, so it's the
	// same target the home screen shows. No goal → the card just hides the target UI.
	const fetchGoals = useCallback(async () => {
		if (!user?.id) return;
		try {
			const response = await fetchAPI(`/api/user?clerkId=${user.id}`, { method: 'GET' });
			const data = response?.data;
			const calories = Math.round(Number(data?.daily_calories) || 0);
			setCalorieGoal(calories > 0 ? calories : undefined);
			setMacroGoals(
				calories > 0
					? {
							protein: Math.round(Number(data.daily_protein) || 0),
							carbs: Math.round(Number(data.daily_carbs) || 0),
							fats: Math.round(Number(data.daily_fats) || 0),
						}
					: undefined
			);
		} catch (error) {
			console.error('Failed to fetch nutrition goals:', error);
		}
	}, [user?.id]);

	useRefetchOnFocus(
		useCallback(() => {
			const date = getTodayDate();
			setToday(date);
			fetchMeals(date);
			fetchGoals();
		}, [fetchMeals, fetchGoals]),
		user?.id ?? ''
	);

	// Open the meal modal when the quick-log FAB (or the card's "Add" buttons) request it
	useEffect(() => {
		if (quickLogPending === 'meal' && isFocused && !logMealModal) {
			setLogMealModal(true);
			consumeQuickLog();
		}
	}, [quickLogPending, isFocused]);

	const handleDeleteMeal = async (mealId: string) => {
		try {
			const response = await fetchAPI(`/api/meals?id=${mealId}`, {
				method: 'DELETE',
			});

			if (response.success) {
				setMeals(prevMeals => prevMeals.filter(meal => meal.id !== mealId));
				fetchMeals();
			} else {
				console.error('Failed to delete meal:', response.error);
			}
		} catch (error) {
			console.error('Error deleting meal:', error);
		}
	};

	return (
		<View className="flex-1" style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
			<SignedIn>
				<ScrollView
					className="w-full h-full"
					style={{ backgroundColor: SCREEN_BG }}
					contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, backgroundColor: SCREEN_BG }}
				>
					<FoodLogCard
						meals={meals}
						calorieGoal={calorieGoal}
						macroGoals={macroGoals}
						isToday
						isLoading={isLoadingMeals}
						error={error}
						onRetry={fetchMeals}
						onDelete={handleDeleteMeal}
					/>
				</ScrollView>
				<LogMealModal
					visible={logMealModal}
					date={today}
					onClose={() => setLogMealModal(false)}
					onMealLogged={fetchMeals}
				/>
			</SignedIn>
		</View>
	);
};

export default Meal;
