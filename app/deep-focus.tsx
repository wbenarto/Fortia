import React from 'react';
import { View, Text, Animated, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';

const DeepFocus = () => {
	const insets = useSafeAreaInsets();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(50)).current;
	const checkmarkAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0)).current;

	const [elapsedTime, setElapsedTime] = useState(0); // Start from 0 seconds
	const [isRunning, setIsRunning] = useState(false);
	const [isComplete, setIsComplete] = useState(false);
	const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
	const intervalRef = useRef<number | null>(null);

	const { user } = useUser();
	const { getToken } = useAuth();

	// Real data for weekly deep focus hours
	const [weeklyFocusData, setWeeklyFocusData] = useState([
		{ label: 'Sun', value: 0, dataPointText: '0h' },
		{ label: 'Mon', value: 0, dataPointText: '0h' },
		{ label: 'Tue', value: 0, dataPointText: '0h' },
		{ label: 'Wed', value: 0, dataPointText: '0h' },
		{ label: 'Thu', value: 0, dataPointText: '0h' },
		{ label: 'Fri', value: 0, dataPointText: '0h' },
		{ label: 'Sat', value: 0, dataPointText: '0h' },
	]);

	// Statistics data
	const [statsData, setStatsData] = useState({
		today: 0,
		week: 0,
		year: 0,
	});

	useEffect(() => {
		// Start the animation when component mounts
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: 0,
				duration: 800,
				useNativeDriver: true,
			}),
		]).start();
	}, [fadeAnim, slideAnim]);

	// Fetch weekly focus data when component mounts
	useEffect(() => {
		if (user?.id) {
			fetchWeeklyFocusData();
			fetchStatsData();
		}
	}, [user?.id]);

	useEffect(() => {
		if (isRunning) {
			intervalRef.current = setInterval(() => {
				setElapsedTime(prevTime => {
					const newTime = prevTime + 1;
					// Check if we've reached 5 minutes (300 seconds)
					if (newTime >= 5 * 60) {
						setIsRunning(false);
						setIsComplete(true);
						// Save completed session
						saveFocusSession(newTime, true);
						// Animate checkmark
						Animated.parallel([
							Animated.timing(checkmarkAnim, {
								toValue: 1,
								duration: 500,
								useNativeDriver: true,
							}),
							Animated.spring(scaleAnim, {
								toValue: 1,
								tension: 100,
								friction: 8,
								useNativeDriver: true,
							}),
						]).start();
					}
					return newTime;
				});
			}, 1000);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [isRunning]);

	const startTimer = () => {
		if (!isRunning && !isComplete) {
			setIsRunning(true);
			setSessionStartTime(new Date());
		}
	};

	const pauseTimer = async () => {
		if (isRunning) {
			setIsRunning(false);
			// Save the session when paused
			await saveFocusSession(elapsedTime, false);
		}
	};

	const resetTimer = () => {
		setElapsedTime(0);
		setIsRunning(false);
		setIsComplete(false);
		setSessionStartTime(null);
		checkmarkAnim.setValue(0);
		scaleAnim.setValue(0);
	};

	// Handle navigation away - save session if running
	const handleBackPress = useCallback(async () => {
		if (isRunning && elapsedTime > 0) {
			Alert.alert(
				'Save Focus Session?',
				'You have an active focus session. Would you like to save it before leaving?',
				[
					{
						text: 'Cancel',
						style: 'cancel',
					},
					{
						text: 'Save & Leave',
						onPress: async () => {
							await saveFocusSession(elapsedTime, false);
							router.back();
						},
					},
					{
						text: 'Leave Without Saving',
						style: 'destructive',
						onPress: () => router.back(),
					},
				]
			);
		} else {
			router.back();
		}
	}, [isRunning, elapsedTime]);

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const saveFocusSession = async (duration: number, isCompleted: boolean = false) => {
		if (!user?.id || duration <= 0) return;

		try {
			const token = await getToken();
			const sessionEndTime = new Date();

			const response = await fetchAPI('/api/deep-focus', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					clerkId: user.id,
					durationSeconds: duration,
					sessionStartTime: sessionStartTime?.toISOString(),
					sessionEndTime: sessionEndTime.toISOString(),
					isCompleted,
				}),
			});

			if (response.success) {
				console.log('Focus session saved successfully:', response.data);
				// Refresh chart data after saving
				fetchWeeklyFocusData();
				fetchStatsData();
			} else {
				console.error('Failed to save focus session:', response.error);
			}
		} catch (error) {
			console.error('Error saving focus session:', error);
		}
	};

	const fetchWeeklyFocusData = async () => {
		if (!user?.id) return;

		try {
			const token = await getToken();
			const response = await fetchAPI(`/api/deep-focus?clerkId=${user.id}&period=week`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.success && response.data) {
				console.log('Weekly focus data:', response.data);
				console.log('Current date:', new Date().toISOString());

				// Create a map of day labels to hours
				const dayMap: { [key: string]: number } = {};
				response.data.forEach((item: any) => {
					dayMap[item.day_label] = parseFloat(item.total_hours);
				});

				// Update chart data with real values
				const updatedData = [
					{
						label: 'Sun',
						value: dayMap['Sun'] || 0,
						dataPointText: `${(dayMap['Sun'] || 0).toFixed(1)}h`,
					},
					{
						label: 'Mon',
						value: dayMap['Mon'] || 0,
						dataPointText: `${(dayMap['Mon'] || 0).toFixed(1)}h`,
					},
					{
						label: 'Tue',
						value: dayMap['Tue'] || 0,
						dataPointText: `${(dayMap['Tue'] || 0).toFixed(1)}h`,
					},
					{
						label: 'Wed',
						value: dayMap['Wed'] || 0,
						dataPointText: `${(dayMap['Wed'] || 0).toFixed(1)}h`,
					},
					{
						label: 'Thu',
						value: dayMap['Thu'] || 0,
						dataPointText: `${(dayMap['Thu'] || 0).toFixed(1)}h`,
					},
					{
						label: 'Fri',
						value: dayMap['Fri'] || 0,
						dataPointText: `${(dayMap['Fri'] || 0).toFixed(1)}h`,
					},
					{
						label: 'Sat',
						value: dayMap['Sat'] || 0,
						dataPointText: `${(dayMap['Sat'] || 0).toFixed(1)}h`,
					},
				];

				setWeeklyFocusData(updatedData);
			} else {
				console.error('Failed to fetch weekly focus data:', response.error);
			}
		} catch (error) {
			console.error('Error fetching weekly focus data:', error);
		}
	};

	const fetchStatsData = async () => {
		if (!user?.id) return;

		try {
			const token = await getToken();

			// Fetch today's data
			const todayResponse = await fetchAPI(`/api/deep-focus?clerkId=${user.id}&period=today`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			// Fetch week's data
			const weekResponse = await fetchAPI(`/api/deep-focus?clerkId=${user.id}&period=week`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			// Fetch year's data
			const yearResponse = await fetchAPI(`/api/deep-focus?clerkId=${user.id}&period=year`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});

			let todayHours = 0;
			let weekHours = 0;
			let yearHours = 0;

			if (todayResponse.success && todayResponse.data && todayResponse.data.length > 0) {
				todayHours = parseFloat(todayResponse.data[0].total_hours || 0);
			}

			if (weekResponse.success && weekResponse.data && weekResponse.data.length > 0) {
				weekHours = weekResponse.data.reduce((sum: number, item: any) => {
					return sum + parseFloat(item.total_hours || 0);
				}, 0);
			}

			if (yearResponse.success && yearResponse.data && yearResponse.data.length > 0) {
				yearHours = yearResponse.data.reduce((sum: number, item: any) => {
					return sum + parseFloat(item.total_hours || 0);
				}, 0);
			}

			setStatsData({
				today: todayHours,
				week: weekHours,
				year: yearHours,
			});
		} catch (error) {
			console.error('Error fetching stats data:', error);
		}
	};

	// Calculate dynamic max value for chart
	const calculateMaxValue = () => {
		if (weeklyFocusData.length === 0) return 1;

		const maxHours = Math.max(...weeklyFocusData.map(item => item.value));

		// If all values are 0, set max to 1 for visibility
		if (maxHours === 0) return 1;

		// Return max hours + 0.5, but minimum of 1 for visibility
		// Round up to nearest whole number for clean y-axis labels
		return Math.round(Math.max(maxHours + 0.5, 1));
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1 bg-[#84e39d]" style={{ paddingTop: insets.top }}>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={handleBackPress}>
						<Ionicons name="arrow-back" size={24} color="black" />
					</TouchableOpacity>
					<Text className="text-black text-lg font-JakartaSemiBold">Deep Focus</Text>
					<View style={{ width: 24 }} />
				</View>

				<ScrollView className="flex-1 px-6 py-4">
					{/* Focus Statistics Cards */}
					<View className="mb-6">
						<View className="flex-row justify-between space-x-3">
							{/* Today Card */}
							<View className="flex-1 items-center bg-yellow-100 rounded-lg p-4 shadow-sm ">
								<Text className="text-xs text-gray-500 font-JakartaSemiBold mb-1">Today</Text>
								<Text className="text-xl font-bold text-black font-JakartaSemiBold">
									{statsData.today < 1
										? `${Math.round(statsData.today * 60)}m`
										: `${statsData.today.toFixed(1)}h`}
								</Text>
							</View>

							{/* Week Card */}
							<View className="flex-1 items-center bg-yellow-100 rounded-lg p-4 shadow-sm ">
								<Text className="text-xs text-gray-500 font-JakartaSemiBold mb-1">This Week</Text>
								<Text className="text-xl font-bold text-black font-JakartaSemiBold">
									{statsData.week.toFixed(1)}h
								</Text>
							</View>

							{/* Year Card */}
							<View className="flex-1 items-center bg-yellow-100 rounded-lg p-4 shadow-sm ">
								<Text className="text-xs text-gray-500 font-JakartaSemiBold mb-1">This Year</Text>
								<Text className="text-xl font-bold text-black font-JakartaSemiBold">
									{statsData.year.toFixed(1)}h
								</Text>
							</View>
						</View>
					</View>

					{/* Weekly Focus Chart */}
					<View className=" mb-6">
						<View className="rounded-lg p-2 shadow-sm">
							<BarChart
								data={weeklyFocusData}
								barWidth={16}
								spacing={20}
								frontColor="#fef08a"
								height={100}
								roundedTop
								hideRules
								xAxisLabelsVerticalShift={10}
								noOfSections={2}
								maxValue={calculateMaxValue()}
								yAxisColor="#e5e7eb"
								xAxisColor="transparent"
								yAxisTextStyle={{ color: 'black', fontWeight: 500, fontSize: 12 }}
								xAxisLabelTextStyle={{ color: '#374151', fontSize: 12, fontWeight: '600' }}
								yAxisLabelTexts={[
									'0',
									'1',
									'2',
									'3',
									'4',
									'5',
									'6',
									'7',
									'8',
									'9',
									'10',
									'11',
									'12',
									'13',
									'14',
									'15',
									'16',
									'17',
									'18',
									'19',
									'20',
								]}
								renderTooltip={({ value, index }: { value: number; index: number }) => (
									<View className="bg-gray-100 px-2 py-1 rounded">
										<Text className="text-white text-xs font-medium">
											{weeklyFocusData[index].dataPointText}
										</Text>
									</View>
								)}
							/>
						</View>
					</View>
					<Animated.View
						className="flex flex-col items-center justify-center py-8"
						style={{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						}}
					>
						{/* Timer Display */}
						<View className="mb-8">
							<Text className="text-6xl font-bold text-black text-center font-mono">
								{formatTime(elapsedTime)}
							</Text>
						</View>

						{/* Checkmark Animation */}
						{isComplete && (
							<Animated.View
								className="mb-6"
								style={{
									opacity: checkmarkAnim,
									transform: [{ scale: scaleAnim }],
								}}
							>
								<View className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
									<Ionicons name="checkmark" size={32} color="white" />
								</View>
							</Animated.View>
						)}

						{/* Start/Pause/Reset Button */}
						<View className="flex flex-row items-center justify-center">
							<TouchableOpacity
								className={`w-28 h-28 border-solid border-black border-[1px] rounded-full flex flex-row items-center justify-center ${
									isComplete ? 'bg-green-100' : isRunning ? 'bg-red-100' : 'bg-yellow-100'
								}`}
								onPress={isComplete ? resetTimer : isRunning ? pauseTimer : startTimer}
							>
								<Text className="text-2xl font-bold text-gray-800">
									{isComplete ? 'Reset' : isRunning ? 'Pause' : 'Start'}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Status Text */}
						<View className="mt-4">
							<Text className="text-lg text-black text-center font-JakartaMedium">
								{isComplete
									? 'Focus session completed! 🎉'
									: isRunning
										? 'Stay focused...'
										: elapsedTime > 0
											? 'Timer paused - tap to resume'
											: 'Ready to focus?'}
							</Text>
						</View>
					</Animated.View>
				</ScrollView>
			</View>
		</>
	);
};

export default DeepFocus;
