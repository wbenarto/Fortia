import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import ReactNativeModal from 'react-native-modal';
import Navbar from '@/components/Navbar';
import MacrosTracking from '@/components/MacrosTracking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Food from '@/components/Food';
import SuggestedMeals from '@/components/SuggestedMeals';

const Meal = () => {
	const [addMealModal, setAddMealModal] = useState(false);
	const insets = useSafeAreaInsets();

	const dummyFood = [
		{
			name: 'Chicken Breast',
			weight: 100,
			calories: 120,
			protein: 24,
			carbs: 0,
			fats: 3,
			time: '8:30am',
		},
		{
			name: 'Salad',
			weight: 40,
			calories: 112,
			protein: 24,
			carbs: 0,
			fats: 0,
			time: '12:00pm',
		},
		{
			name: 'Brown Rice',
			weight: 80,
			calories: 112,
			protein: 24,
			carbs: 0,
			fats: 0,
			time: '4:00pm',
		},
		{
			name: 'Banana',
			weight: 30,
			calories: 100,
			protein: 1,
			carbs: 24,
			fats: 0.5,
			time: '8:00pm',
		},
	];
	return (
		<View className="flex-1 bg-[#ffffff]" style={{ paddingTop: insets.top }}>
			<SignedIn>
				<ScrollView stickyHeaderIndices={[0]} className="w-full h-full ">
					<Navbar />
					<View className="w-full pb-20 mt-4">
						<MacrosTracking
							dailyGoal={{
								protein: 245,
								carbs: 245,
								fats: 70,
							}}
							currentIntake={{
								protein: 216,
								carbs: 216,
								fats: 85,
							}}
							weeklyData={[
								{ date: 'Mon', protein: 220, carbs: 210, fats: 75 },
								{ date: 'Tue', protein: 215, carbs: 200, fats: 80 },
								{ date: 'Wed', protein: 225, carbs: 220, fats: 85 },
								{ date: 'Thu', protein: 210, carbs: 215, fats: 78 },
								{ date: 'Fri', protein: 230, carbs: 225, fats: 82 },
								{ date: 'Sat', protein: 216, carbs: 216, fats: 85 },
							]}
						/>
						<View className="w-full ">
							<View className="flex flex-row justify-between items-center px-4">
								<Text className="font-JakartaSemiBold text-lg">Today's Food Log</Text>
							</View>
							<View className="px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
								{dummyFood.map((food, index) => (
									<Food key={index} food={food} />
								))}
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
