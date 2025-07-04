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

	const { user } = useUser();

	// Calculate yAxisOffset based on data range
	const calculateYAxisOffset = (data: ChartDataPoint[]) => {
		if (data.length === 0) return 140;

		const range = data[data.length - 1].value;

		// Adjust offset based on data range
		if (range < 100) return 60; // Small range
		if (range < 140) return 100; // Medium range
		if (range < 180) return 150; // Large range
		return 150; // Very large range
	};

	const { getToken } = useAuth();

	// Get the last weight entry for display
	const lastWeightEntry = userWeights.length > 0 ? userWeights[userWeights.length - 1] : null;
	console.log(userWeights);
	const todayDate = new Date().toISOString().split('T')[0].slice(5);
	console.log(todayDate);

	// Check if last weight entry is from today

	useFocusEffect(
		useCallback(() => {
			const fetchData = async () => {
				const token = await getToken();
				const response = await fetchAPI(`/(api)/weight?userId=${user?.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				});
				// Refresh data when screen comes into focus

				const data = response.data;
				// Process weight data for chart
				const processedData = data
					.sort((a: WeightEntry, b: WeightEntry) => +new Date(a.date) - +new Date(b.date))
					// Group by date and take the latest entry per day to handle duplicates

					.map(({ date, weight }: WeightEntry) => {
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
		}, [])
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
			const fetchData = async () => {
				const token = await getToken();
				const response = await fetchAPI(`/(api)/weight?userId=${user?.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				});

				const data = response.data;

				// Process weight data for chart (same logic as above)
				const processedData = data
					.sort((a: WeightEntry, b: WeightEntry) => +new Date(a.date) - +new Date(b.date))
					// Group by date and take the latest entry per day to handle duplicates
					.reduce((acc: WeightEntry[], entry: WeightEntry) => {
						const existingIndex = acc.findIndex(item => item.date === entry.date);
						if (existingIndex >= 0) {
							// Replace with newer entry (assuming later entries are more recent)
							acc[existingIndex] = entry;
						} else {
							acc.push(entry);
						}
						return acc;
					}, [])
					// Take last 12 entries instead of 6 to show more data
					.slice(-12)
					.map(({ date, weight }: WeightEntry) => {
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
				<Text className="text-[#E3BBA1] text-xs font-JakartaSemiBold">-2.2 lbs this week</Text>
			</View>
			<View className=" px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-end ">
					<Text>
						<Text className="font-JakartaBold text-3xl">
							{lastWeightEntry ? lastWeightEntry.value.toFixed(1) : '--'}
						</Text>{' '}
						<Text className="text-[#64748B]">lbs</Text>
					</Text>
					<Text className="text-xs text-[#64748B]">
						Goal:{' '}
						{lastWeightEntry
							? (() => {
									const goalDifference = lastWeightEntry.value - 150;
									const needsToLose = goalDifference > 0;
									return `${needsToLose ? 'Lose' : 'Grain'} ${Math.abs(goalDifference).toFixed(1)}`;
								})()
							: '--'}{' '}
						lbs
					</Text>
				</View>
				<View className=" overflow-hidden ml-[-20px] border-b-[1px] border-[#F1F5F9] border-solid">
					<LineChart
						color={'#E3BBA1'}
						data={userWeights}
						height={140}
						curved
						textColor={'transparent'}
						spacing={30}
						thickness={3}
						xAxisLabelTextStyle={{ color: 'transparent', fontSize: 12 }}
						yAxisTextStyle={{ color: 'transparent', fontSize: 12 }}
						hideYAxisText
						animationDuration={1000}
						animationEasing="easeOutQuad"
						hideAxesAndRules
						focusEnabled
						showDataPointOnFocus
						focusedDataPointShape="circle"
						focusedDataPointWidth={15}
						focusedDataPointHeight={15}
						focusedDataPointColor="#E3BBA1"
						focusedDataPointRadius={6}
						pointerConfig={{
							pointerLabelComponent: (item: any) => {
								return (
									<View className="w-10 absolute top-0 h-8 flex justify-center items-center mt-4">
										<Text className="text-xs text-[#64748B] font-JakartaSemiBold">
											{item[0].value}
										</Text>
									</View>
								);
							},
							pointerStripColor: 'transparent',
							pointerColor: '#64748B',
						}}
						onFocus={(item: any) => {
							setFocusedPoint(item);
						}}
						dataPointLabelShiftY={-20}
						dataPointLabelShiftX={-5}
						yAxisOffset={calculateYAxisOffset(userWeights)}
					/>
				</View>
				<View className="flex flex-row justify-between py-4">
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Starting</Text>
						<Text className="text-sm">168.8 lbs</Text>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Change</Text>
						<View className="flex flex-row items-center gap-1">
							{lastWeightEntry &&
								(() => {
									const weightChange = 168.8 - lastWeightEntry.value;
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
								{lastWeightEntry ? (168.8 - lastWeightEntry.value).toFixed(1) : '--'} lbs
							</Text>
						</View>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Target</Text>
						<Text className="text-sm">150.0 lbs</Text>
					</View>
				</View>

				<CustomButton
					onPress={handleAddWeightModal}
					title="Log Today's Weight"
					textProp="text-base ml-4"
					IconLeft={() => <Ionicons name="scale-outline" size={24} color="white" />}
				/>

				<ReactNativeModal
					isVisible={addWeightModal}
					onBackdropPress={() => setAddWeightModal(false)}
				>
					<View className="bg-white py-10 px-4 mx-10 rounded-md">
						<View className="pb-4 ">
							<Text className="text-xl text-center font-JakartaSemiBold">Log your weight</Text>
						</View>

						<View className="flex mx-auto w-full justify-center">
							<InputField
								label=""
								placeholder="Enter your weight"
								keyboardType="numeric"
								value={weightForm.weight}
								className="text-center flex p-4 "
								onChangeText={value => setWeightForm({ ...weightForm, weight: value })}
							/>
						</View>
						<View className="mb-6">
							<Text className="text-lg text-center font-JakartaSemiBold">lbs</Text>
						</View>

						<CustomButton onPress={handleWeightSubmission} title="Save" />
					</View>
				</ReactNativeModal>
			</View>
		</View>
	);
};

export default WeightTracking;
