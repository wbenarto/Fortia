import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import ReactNativeModal from 'react-native-modal';
import Navbar from '@/components/Navbar';
import MacrosTracking from '@/components/MacrosTracking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SwipeableFoodCard from '@/components/SwipeableFoodCard';
import SuggestedMeals from '@/components/SuggestedMeals';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';

interface Meal {
	id: string;
	user_id: string;
	food_name: string;
	portion_size: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	fiber: number;
	sugar: number;
	sodium: number;
	confidence_score: number;
	meal_type: string;
	created_at: string;
	updated_at: string;
}

interface FoodItem {
	name: string;
	weight: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
}

const Meal = () => {
	const [addMealModal, setAddMealModal] = useState(false);
	const [meals, setMeals] = useState<Meal[]>([]);
	const [isLoadingMeals, setIsLoadingMeals] = useState(false);
	const [error, setError] = useState('');

	const insets = useSafeAreaInsets();
	const { user } = useUser();

	// Fetch meals on component mount
	useEffect(() => {
		if (user?.id) {
			fetchMeals();
		}
	}, [user?.id]);

	const fetchMeals = async () => {
		if (!user?.id) return;

		setIsLoadingMeals(true);
		setError('');

		try {
			const today = getTodayDate();
			const response = await fetchAPI(`/(api)/meals?clerkId=${user.id}&date=${today}`, {
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
	};

	// Transform database meals to Food component format
	const transformMealsToFoodItems = (meals: Meal[]): FoodItem[] => {
		return meals.map(meal => {
			return {
				name: meal.food_name,
				weight: meal.portion_size,
				calories: meal.calories,
				protein: meal.protein,
				carbs: meal.carbs,
				fats: meal.fats,
			};
		});
	};

	const foodItems = transformMealsToFoodItems(meals);

	// Callback to refresh meals when a new meal is logged
	const handleMealLogged = () => {
		fetchMeals();
	};

	// Reference to MacrosTracking refresh function
	const macrosRefreshRef = useRef<{ refresh: () => void } | null>(null);

	// Callback to refresh macros when a meal is deleted
	const handleMealDeleted = () => {
		// Call the MacrosTracking refresh function directly
		if (macrosRefreshRef.current) {
			macrosRefreshRef.current.refresh();
		}
	};

	// Handle meal deletion
	const handleDeleteMeal = async (mealId: string) => {
		try {
			const response = await fetchAPI(`/(api)/meals?id=${mealId}`, {
				method: 'DELETE',
			});

			if (response.success) {
				// Remove the meal from local state
				setMeals(prevMeals => prevMeals.filter(meal => meal.id !== mealId));
				// Refresh meals list
				handleMealLogged();
				// Trigger macros refresh immediately
				handleMealDeleted();
			} else {
				console.error('Failed to delete meal:', response.error);
			}
		} catch (error) {
			console.error('Error deleting meal:', error);
		}
	};

	return (
		<View className="flex-1 bg-[#ffffff]" style={{ paddingTop: insets.top }}>
			<SignedIn>
				<ScrollView stickyHeaderIndices={[0]} className="w-full h-full">
					<Navbar />
					<View className="w-full pb-20 mt-4">
						<MacrosTracking onMealLogged={handleMealLogged} ref={macrosRefreshRef} />
						<View className="w-full ">
							<View className="flex flex-row justify-between items-center px-4">
								<Text className="font-JakartaSemiBold text-lg">Today's Food Log</Text>
							</View>
							<View className="px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
								{isLoadingMeals ? (
									<View className="py-8 flex items-center justify-center">
										<ActivityIndicator size="large" color="#E3BBA1" />
										<Text className="text-gray-500 mt-2">Loading meals...</Text>
									</View>
								) : error ? (
									<View className="py-8 flex items-center justify-center">
										<Text className="text-red-500 text-center">{error}</Text>
										<TouchableOpacity
											onPress={fetchMeals}
											className="mt-2 px-4 py-2 bg-[#E3BBA1] rounded-lg"
										>
											<Text className="text-white font-JakartaSemiBold">Retry</Text>
										</TouchableOpacity>
									</View>
								) : foodItems.length === 0 ? (
									<View className="py-8 flex items-center justify-center">
										<Text className="text-gray-500 text-center">No meals logged today</Text>
										<Text className="text-gray-400 text-sm text-center mt-1">
											Log your first meal to see it here
										</Text>
									</View>
								) : (
									foodItems.map((food, index) => (
										<SwipeableFoodCard
											key={meals[index].id}
											food={food}
											mealId={meals[index].id}
											onDelete={handleDeleteMeal}
										/>
									))
								)}
							</View>
						</View>
						<SuggestedMeals />
					</View>
				</ScrollView>
			</SignedIn>
		</View>
	);
};

export default Meal;
