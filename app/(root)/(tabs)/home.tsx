import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import { CartesianChart, Line } from 'victory-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import {
	View,
	Text,
	Image,
	ScrollView,
	TouchableOpacity,
	Button,
	Platform,
	ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Navbar from '@/components/Navbar';
import WeightTracking from '@/components/WeightTracking';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import ActivityTracking from '@/components/ActivityTracking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { images } from '@/constants/index';
import { useState, useEffect, useCallback } from 'react';
import { fetchAPI, useFetch } from '@/lib/fetch';
import { Weights } from '@/types/type';
import WeeklyTracking from '@/components/WeeklyTracking';
import MacrosTracking from '@/components/MacrosTracking';
import { Ionicons } from '@expo/vector-icons';
// import { DATA } from '@/lib/data'

export default function Page() {
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const router = useRouter();
	const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

	// Check if user has completed onboarding
	useFocusEffect(
		useCallback(() => {
			const checkOnboarding = async () => {
				if (!user?.id) return;

				try {
					const response = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
						method: 'GET',
					});

					if (response.success && response.data) {
						// Check if user has completed onboarding by looking for required fields
						const userData = response.data;
						if (userData.weight && userData.height && userData.fitness_goal) {
							setHasCompletedOnboarding(true);
						} else {
							// User hasn't completed onboarding, redirect to onboarding setup
							router.replace('/(auth)/onboarding-setup');
							return;
						}
					} else if (response.error === 'User not found') {
						// User doesn't exist in database, create them first
						try {
							const userResponse = await fetchAPI('/(api)/user', {
								method: 'POST',
								body: JSON.stringify({
									firstName: user?.firstName || '',
									lastName: user?.lastName || '',
									email: user?.emailAddresses?.[0]?.emailAddress || '',
									clerkId: user.id,
								}),
							});

							if (userResponse.success) {
								// User created successfully, redirect to onboarding setup
								router.replace('/(auth)/onboarding-setup');
								return;
							} else {
								// User creation failed, redirect to onboarding setup anyway
								router.replace('/(auth)/onboarding-setup');
								return;
							}
						} catch (userError) {
							console.error('User creation error:', userError);
							// If we can't create the user, redirect to onboarding setup
							router.replace('/(auth)/onboarding-setup');
							return;
						}
					} else {
						// Other error, redirect to onboarding setup
						router.replace('/(auth)/onboarding-setup');
						return;
					}
				} catch (error) {
					console.error('Failed to check onboarding status:', error);
					// If there's an error, redirect to onboarding setup
					router.replace('/(auth)/onboarding-setup');
					return;
				} finally {
					setIsCheckingOnboarding(false);
				}
			};

			checkOnboarding();
		}, [user?.id])
	);

	// Show loading while checking onboarding status
	if (isCheckingOnboarding) {
		return (
			<View className="flex-1 bg-[#262135] justify-center items-center">
				<ActivityIndicator size="large" color="#E3BBA1" />
				<Text className="text-white mt-4 text-lg">Setting up your experience...</Text>
			</View>
		);
	}

	// Don't render the main content if onboarding is not completed
	if (!hasCompletedOnboarding) {
		return null;
	}

	return (
		<View className="flex-1 bg-[#ffffff]" style={{ paddingTop: insets.top }}>
			<SignedIn>
				<ScrollView stickyHeaderIndices={[0]} className="w-full h-full ">
					<Navbar />
					<View className="w-full pb-10">
						<WeeklyCalendar />
						<WeightTracking />
						<MacrosTracking />
						<ActivityTracking />
					</View>
					{/* <View className="w-full  px-8 ">
						<Text className="text-white text-3xl font-JakartaSemiBold mt-8">Macros</Text>
						<View className="w-full h-40 rounded-md flex items-center flex-row justify-between">
							<View className="w-[30%] py-8 bg-blue-100 rounded-full">
								<Text className="text-center">216/245g</Text>
								<Text className="text-center font-JakartaSemiBold text-xl">Carbs</Text>
							</View>
							<View className="w-[30%] py-8 bg-yellow-100 rounded-full">
								<Text className="text-center">216/245g</Text>
								<Text className="text-center font-JakartaSemiBold text-xl">Fat</Text>
							</View>
							<View className="w-[30%] py-8 bg-green-100 rounded-full">
								<Text className="text-center">216/245g</Text>
								<Text className="text-center font-JakartaSemiBold text-xl">Protein</Text>
							</View>
						</View>
					</View> */}
					{/* <View className="w-full  px-8 pb-40">
						<Text className="text-white text-3xl font-JakartaSemiBold mt-8">
							Your {'\n'}
							Schedule
						</Text>
						<Text className="text-white mt-4">Today's Activity</Text>
						<View className="w-full ">
							
							<View className="h-20 my-2 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Bench Press</Text>
									<Text className="text-gray-200 ">4 sets of 12</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
							<View className="h-20 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Incline Dumbell Press</Text>
									<Text className="text-gray-200 ">4 sets of 12</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
							<View className="h-20 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Ball Shooting Drill</Text>
									<Text className="text-gray-200 ">50 made threes</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
							<View className="h-20 w-full rounded-[20px] items-center justify-between flex-row">
								<View className="w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center">
									<View className="w-4 h-4 rounded-full bg-black"></View>
								</View>
								<View className="ml-4">
									<Text className="text-gray-100 text-lg ">Tricep Dips</Text>
									<Text className="text-gray-200 ">4 sets of 8</Text>
								</View>
								<View className="w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto">
									<Text className="text-md font-JakartaExtraBold">Start</Text>
								</View>
							</View>
						</View>
					</View> */}
				</ScrollView>
			</SignedIn>
			<SignedOut>
				<Link href="/(auth)/sign-in">
					<Text>Sign in</Text>
				</Link>
				<Link href="/(auth)/sign-up">
					<Text>Sign up</Text>
				</Link>
			</SignedOut>
		</View>
	);
}
