import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
// import { CartesianChart, Line } from 'victory-native';
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
	Alert,
} from 'react-native';
import Navbar from '@/components/Navbar';
import WeightTracking from '@/components/WeightTracking';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import ActivityTracking from '@/components/ActivityTracking';
import HomeSliderComponent from '@/components/HomeSliderComponent';
import FortiaPT from '@/components/FortiaPT';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { images } from '@/constants/index';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAPI, useFetch } from '@/lib/fetch';
import { Weights } from '@/types/type';
import WeeklyTracking from '@/components/WeeklyTracking';
import MacrosTracking from '@/components/MacrosTracking';
import RecipeBreakdownModal from '@/components/RecipeBreakdownModal';
import UsernameCollectionModal from '@/components/UsernameCollectionModal';
import { logDailyBMR } from '@/lib/bmrLogging';
import { useUserProfile } from '@/lib/userUtils';
import { getUnifiedBMR } from '@/lib/unifiedBMRCalculator';
// import { DATA } from '@/lib/data'

export default function Page() {
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const router = useRouter();
	const userProfile = useUserProfile();
	const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
	const [showRecipeModal, setShowRecipeModal] = useState(false);
	const [showUsernameModal, setShowUsernameModal] = useState(false);
	const [showFortia, setShowFortia] = useState(false);
	const [userNeedsUsername, setUserNeedsUsername] = useState(false);
	const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);
	const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);
	const [questRefreshTrigger, setQuestRefreshTrigger] = useState(0);

	// Ref for MacrosTracking component
	const macrosTrackingRef = useRef<{ refresh: () => void }>(null);

	// Function to refresh the calorie chart
	const refreshCalorieChart = useCallback(() => {
		setChartRefreshTrigger(prev => prev + 1);
	}, []);

	// Function to refresh dashboard counts (meals, weights, exercises)
	const refreshDashboardCounts = useCallback(() => {
		setDashboardRefreshTrigger(prev => prev + 1);
	}, []);

	// Function to refresh quest status
	const refreshQuests = useCallback(() => {
		setQuestRefreshTrigger(prev => prev + 1);
	}, []);

	// Combined refresh function for when meals are logged
	const onMealLogged = useCallback(() => {
		refreshCalorieChart();
		refreshDashboardCounts();
		refreshQuests();
	}, [refreshCalorieChart, refreshDashboardCounts, refreshQuests]);

	// Combined refresh function for when activities are logged
	const onActivityLogged = useCallback(() => {
		refreshCalorieChart();
		refreshDashboardCounts();
		refreshQuests();
	}, [refreshCalorieChart, refreshDashboardCounts, refreshQuests]);

	// Combined refresh function for when weight is logged
	const onWeightLogged = useCallback(() => {
		refreshCalorieChart();
		refreshDashboardCounts();
		refreshQuests();
		// Refresh MacrosTracking to update macro targets based on new BMR/TDEE
		macrosTrackingRef.current?.refresh();
	}, [refreshCalorieChart, refreshDashboardCounts, refreshQuests]);

	// Function to log daily BMR
	const logDailyBMRIfNeeded = useCallback(async () => {
		if (!user?.id) return;

		// Use unified BMR calculation with user's current data
		const bmr = await getUnifiedBMR(user.id);

		// Validate BMR value before logging
		if (!bmr || bmr <= 0) {
			console.warn('Invalid BMR value, skipping logging:', bmr);
			return;
		}

		try {
			const success = await logDailyBMR({
				clerkId: user.id,
				bmr: bmr,
				onSuccess: () => {
					// Refresh charts when BMR is logged
					refreshCalorieChart();
					refreshDashboardCounts();
				},
				onError: error => {
					console.error('BMR logging failed:', error);
				},
			});

			if (success) {
				// BMR logged successfully
			}
		} catch (error) {
			console.error('Error in BMR logging:', error);
		}
	}, [
		user?.id,
		userProfile?.weight,
		userProfile?.height,
		userProfile?.fitnessGoal,
		refreshCalorieChart,
		refreshDashboardCounts,
	]);

	// Check if user has completed onboarding
	useFocusEffect(
		useCallback(() => {
			const checkOnboarding = async () => {
				if (!user?.id) return;

				try {
					const response = await fetchAPI(`/api/user?clerkId=${user.id}`, {
						method: 'GET',
					});

					if (response.success && response.data) {
						// Check if user has completed onboarding by looking for required fields
						const userData = response.data;
						if (userData.weight && userData.height && userData.fitness_goal) {
							// Check if user needs a username - MANDATORY
							if (!userData.username) {
								setUserNeedsUsername(true);
								setShowUsernameModal(true);
								// Don't set hasCompletedOnboarding to true until username is set
								return;
							}

							// Only set completed onboarding if user has username
							setHasCompletedOnboarding(true);
							// BMR logging will be handled by the consolidated useEffect below
						} else {
							// User hasn't completed onboarding, redirect to onboarding setup
							router.replace('/(auth)/onboarding-setup');
							return;
						}
					} else if (response.error === 'User not found') {
						// User doesn't exist in database, create them first
						try {
							const userResponse = await fetchAPI('/api/user', {
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

	// Log BMR when userProfile is loaded and user has completed onboarding
	// This is the ONLY place where BMR logging should be triggered
	useEffect(() => {
		if (hasCompletedOnboarding && userProfile?.weight && userProfile?.height && user?.id) {
			// Add a small delay to ensure all data is properly loaded
			const timeoutId = setTimeout(() => {
				logDailyBMRIfNeeded();
			}, 500);

			return () => clearTimeout(timeoutId);
		}
	}, [
		hasCompletedOnboarding,
		userProfile?.weight,
		userProfile?.height,
		user?.id,
		logDailyBMRIfNeeded,
	]);

	// Show loading while checking onboarding status
	if (isCheckingOnboarding) {
		return (
			<View className="flex-1 bg-[#E3BBA1] justify-center items-center">
				<ActivityIndicator size="large" color="black" />
				<Image source={require('@/assets/images/logo-main-fortia.svg')} className="w-full h-10" />
				<Text className="text-black mt-4 text-lg">Setting up your experience...</Text>
			</View>
		);
	}

	const handleClose = () => {
		setShowFortia(false);
	};

	// Note: We removed the early return to allow modals to render even when onboarding is not completed

	return (
		<View className="flex-1 bg-[#ffffff]" style={{ paddingTop: insets.top }}>
			<SignedIn>
				{/* Show main content only if onboarding is completed */}
				{hasCompletedOnboarding && (
					<ScrollView stickyHeaderIndices={[0]} className="w-full h-full ">
						<Navbar />
						<View className="w-full pb-10">
							<WeeklyCalendar />

							{/* Slider Component */}
							<HomeSliderComponent
								totalMealsLog={0}
								totalWeightsLog={0}
								totalExercisesLog={0}
								refreshTrigger={chartRefreshTrigger}
								dashboardRefreshTrigger={dashboardRefreshTrigger}
								questRefreshTrigger={questRefreshTrigger}
								onClose={() => setShowFortia(!showFortia)}
							/>

							{showFortia && (
								<FortiaPT onClose={() => setShowFortia(!showFortia)} isVisible={showFortia} />
							)}
							<WeightTracking onWeightLogged={onWeightLogged} />
							<MacrosTracking ref={macrosTrackingRef} onMealLogged={onMealLogged} />
							<ActivityTracking
								refreshTrigger={dashboardRefreshTrigger}
								onActivityLogged={onActivityLogged}
							/>
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
				)}

				{/* Show loading screen if user needs username */}
				{userNeedsUsername && !hasCompletedOnboarding && (
					<View className="flex-1 bg-[#E3BBA1] justify-center items-center">
						<ActivityIndicator size="large" color="black" />
						<Image
							source={require('@/assets/images/logo-main-fortia.svg')}
							className="w-full h-10"
						/>
						<Text className="text-black mt-4 text-lg">Setting up your username...</Text>
					</View>
				)}

				<RecipeBreakdownModal visible={showRecipeModal} onClose={() => setShowRecipeModal(false)} />
				<UsernameCollectionModal
					isVisible={showUsernameModal}
					onClose={() => {
						// Don't allow closing - username is mandatory
						Alert.alert('Username Required', 'You must set a username to continue using Fortia.', [
							{ text: 'OK' },
						]);
					}}
					onSuccess={() => {
						setUserNeedsUsername(false);
						setShowUsernameModal(false);
						setHasCompletedOnboarding(true); // Now allow access to home screen
					}}
					clerkId={user?.id || ''}
				/>
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
