import { View, Text, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import { Link, useFocusEffect } from 'expo-router';
import ReactNativeModal from 'react-native-modal';
import { fetchAPI, useFetch } from '@/lib/fetch';
import InputField from '@/components/InputField';
import CustomButton from '@/components/CustomButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-gifted-charts';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { getTodayDate } from '@/lib/dateUtils';
import { useGoalsStore } from '@/store';
import { useUserProfile } from '@/lib/userUtils';

interface WeightEntry {
	date: string;
	weight: string;
}

interface ChartDataPoint {
	label: string;
	value: number;
	dataPointText: string;
}

const WeightTracking = () => {
	const [userWeights, setUserWeights] = useState<ChartDataPoint[]>([]);
	const [addWeightModal, setAddWeightModal] = useState(false);
	const [weightForm, setWeightForm] = useState({
		weight: '',
		date: new Date(), // This is just for the form state, actual date uses getTodayDate()
	});
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [focusedPoint, setFocusedPoint] = useState(null);
	const [targetWeight, setTargetWeight] = useState<number | null>(null);
	const [startingWeight, setStartingWeight] = useState<number | null>(null);

	const { user } = useUser();
	const userProfile = useUserProfile();
	const { goalsUpdated, resetGoalsUpdate } = useGoalsStore();

	// Calculate yAxisOffset based on data range
	const calculateYAxisOffset = (data: ChartDataPoint[]) => {
		if (data.length === 0) return 140;

		const range = data[data.length - 1].value;

		// Adjust offset based on data range
		if (range < 100) return 60; // Small range
		if (range < 140) return 100; // Medium range
		if (range < 180) return 140; // Large range
		return 170; // Very large range
	};

	const { getToken } = useAuth();

	// Get the last weight entry for display
	const lastWeightEntry = userWeights.length > 0 ? userWeights[userWeights.length - 1] : null;

	// Check if last weight entry is from today

	// Listen for goals updates and refresh target weight
	useEffect(() => {
		if (goalsUpdated) {
			fetchTargetWeight();
			resetGoalsUpdate();
		}
	}, [goalsUpdated]);

	// Fetch user's target weight and starting weight
	const fetchTargetWeight = async () => {
		if (!user?.id) return;

		try {
			const response = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				// Target weight and starting weight are already in lbs
				setTargetWeight(response.data.target_weight);
				setStartingWeight(response.data.starting_weight);
			}
		} catch (error) {
			console.error('Failed to fetch target weight:', error);
		}
	};

	useFocusEffect(
		useCallback(() => {
			const fetchData = async () => {
				if (!user?.id) return;

				try {
					const token = await getToken();
					const response = await fetchAPI(`/(api)/weight?clerkId=${user.id}`, {
						method: 'GET',
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
					});

					if (!response.data) {
						setUserWeights([]);
						return;
					}

					const data = response.data;

					// Process weight data for chart - data is already sorted ASC from API
					// Take last 8 entries to show recent data
					const sortedData = data.slice(-8);

					const processedData = sortedData.map(({ date, weight }: WeightEntry) => {
						const dateObj = new Date(date);
						const today = new Date();
						const isThisYear = dateObj.getFullYear() === today.getFullYear();

						// Format label based on whether it's this year
						let label;
						if (isThisYear) {
							label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
						} else {
							label = dateObj.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: '2-digit',
							});
						}

						return {
							label,
							value: +weight,
							dataPointText: `${weight}`,
						};
					});

					setUserWeights(processedData);
				} catch (error) {
					console.error('Error fetching weight data:', error);
					setUserWeights([]);
				}
			};

			fetchData();
			fetchTargetWeight();
		}, [user?.id])
	);

	const handleAddWeightModal = () => setAddWeightModal(!addWeightModal);

	const handleWeightSubmission = async () => {
		// Handle weight form submission

		// Validate weight input
		if (!weightForm.weight || isNaN(Number(weightForm.weight))) {
			console.error('Invalid weight input');
			return;
		}

		try {
			// Use today's date in user's local timezone (same as meal logging)
			const dateString = getTodayDate();

			await fetchAPI('/(api)/weight', {
				method: 'POST',
				body: JSON.stringify({
					weight: weightForm.weight,
					date: dateString,
					clerkId: user?.id,
				}),
			});

			// Add a small delay to ensure the database has been updated
			await new Promise(resolve => setTimeout(resolve, 100));

			const fetchData = async () => {
				const token = await getToken();
				const response = await fetchAPI(`/(api)/weight?clerkId=${user?.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				});

				const data = response.data;

				// Process weight data for chart (same logic as above)
				const processedData = data.slice(-8).map(({ date, weight }: WeightEntry) => {
					const dateObj = new Date(date);
					const today = new Date();
					const isThisYear = dateObj.getFullYear() === today.getFullYear();

					// Format label based on whether it's this year
					let label;
					if (isThisYear) {
						label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
					} else {
						label = dateObj.toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: '2-digit',
						});
					}

					return {
						label,
						value: +weight,
						dataPointText: `${weight}`,
					};
				});

				setUserWeights(processedData);
			};

			fetchData();
			setAddWeightModal(false);
			// Reset form
			setWeightForm({
				weight: '',
				date: new Date(), // This is just for the form state, actual date uses getTodayDate()
			});
		} catch (error) {
			console.error('Weight logging error:', error);
		}
	};
	return (
		<View className="w-full">
			<View className="flex flex-row justify-between items-center px-4">
				<Text className="font-JakartaSemiBold text-lg ">Weight Progress</Text>
				<View className="flex flex-row w-24 items-center ">
					<TouchableOpacity
						onPress={handleAddWeightModal}
						className="bg-[#E3BBA1] px-3 py-1 rounded-full"
					>
						<Text className="text-white text-xs font-JakartaSemiBold">Log Weight</Text>
					</TouchableOpacity>
				</View>
			</View>
			<View className=" px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-center ">
					<Text>
						<Text className="font-JakartaBold text-3xl">
							{lastWeightEntry ? lastWeightEntry.value.toFixed(1) : '--'}
						</Text>{' '}
						<Text className="text-[#64748B]">lbs</Text>
					</Text>
					<Text className="text-[10px] text-[#64748B]">
						Goal:{' '}
						{lastWeightEntry && targetWeight
							? (() => {
									const goalDifference = lastWeightEntry.value - Number(targetWeight);
									const needsToLose = goalDifference > 0;
									return `${needsToLose ? 'Lose' : 'Gain'} ${Math.abs(goalDifference).toFixed(1)}`;
								})()
							: '--'}{' '}
						lbs
					</Text>
				</View>
				<View className=" h-32 overflow-hidden ml-[-20px] border-b-[1px] border-[#F1F5F9] border-solid">
					{userWeights.length > 0 ? (
						<LineChart
							color={'#E3BBA1'}
							data={userWeights}
							height={80}
							width={300}
							curved
							textColor={'transparent'}
							spacing={30}
							thickness={3}
							xAxisLabelTextStyle={{ color: 'transparent', fontSize: 12 }}
							yAxisTextStyle={{ color: 'transparent', fontSize: 12 }}
							hideYAxisText
							hideAxesAndRules
							focusEnabled
							showDataPointOnFocus
							focusedDataPointShape="circle"
							focusedDataPointWidth={15}
							focusedDataPointHeight={15}
							focusedDataPointColor="#E3BBA1"
							focusedDataPointRadius={6}
							onFocus={(item: any) => {
								setFocusedPoint(item);
							}}
							yAxisOffset={calculateYAxisOffset(userWeights)}
						/>
					) : (
						<View className="h-[100px] flex justify-center items-center">
							<Text className="text-gray-400 text-sm">No weight data available</Text>
						</View>
					)}
				</View>
				<View className="flex flex-row justify-between py-4">
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Starting</Text>
						<Text className="text-sm">
							{startingWeight ? `${Number(startingWeight).toFixed(1)} lbs` : '--'}
						</Text>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Change</Text>
						<View className="flex flex-row items-center gap-1">
							{lastWeightEntry &&
								startingWeight &&
								(() => {
									const weightChange = startingWeight - lastWeightEntry.value;
									const hasLostWeight = weightChange > 0;
									return (
										<Ionicons
											name={hasLostWeight ? 'trending-down' : 'trending-up'}
											size={14}
											color={hasLostWeight ? '#DC2626' : '#16A34A'}
										/>
									);
								})()}
							<Text className="text-sm text-black font-JakartaSemiBold">
								{lastWeightEntry && startingWeight
									? (startingWeight - lastWeightEntry.value).toFixed(1)
									: '--'}{' '}
								lbs
							</Text>
						</View>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Target</Text>
						<Text className="text-sm">
							{targetWeight ? `${Number(targetWeight).toFixed(1)} lbs` : '--'}
						</Text>
					</View>
				</View>

				<ReactNativeModal
					isVisible={addWeightModal}
					onBackdropPress={() => setAddWeightModal(false)}
				>
					<View className="bg-white py-14 px-4 mx-0 rounded-md">
						<View className="pb-4 ">
							<Text className="text-xl text-center font-JakartaSemiBold">Log your weight</Text>
						</View>

						<View className="flex mx-auto  my-8 w-full justify-center">
							<InputField
								label=""
								placeholder="lbs"
								keyboardType="numeric"
								value={weightForm.weight}
								className="text-center flex p-4 "
								onChangeText={value => setWeightForm({ ...weightForm, weight: value })}
							/>
						</View>

						<CustomButton onPress={handleWeightSubmission} title="Save" />
					</View>
				</ReactNativeModal>
			</View>
		</View>
	);
};

export default WeightTracking;
