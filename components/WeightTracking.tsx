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
		date: new Date(),
	});
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [focusedPoint, setFocusedPoint] = useState(null);

	const { user } = useUser();

	// Calculate yAxisOffset based on data range
	const calculateYAxisOffset = (data: ChartDataPoint[]) => {
		if (data.length === 0) return 140;

		const values = data.map(item => item.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min;

		// Adjust offset based on data range
		if (range < 5) return 120; // Small range
		if (range < 10) return 140; // Medium range
		if (range < 20) return 160; // Large range
		return 10; // Very large range
	};

	const DATA = [
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
	];

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
				// setUserWeights(data)
				setUserWeights(
					data
						.sort((a: WeightEntry, b: WeightEntry) => +new Date(a.date) - +new Date(b.date))
						.slice(-6)
						.map(({ date, weight }: WeightEntry) => ({
							label: date.split('T')[0].slice(5),
							value: +weight,
							dataPointText: `${weight}`,
						}))
				);
			};

			fetchData();
		}, [])
	);

	const handleAddWeightModal = () => setAddWeightModal(!addWeightModal);

	const handleWeightSubmission = async () => {
		// Handle weight form submission

		try {
			await fetchAPI('/(api)/weight', {
				method: 'POST',
				body: JSON.stringify({
					weight: weightForm.weight,
					date: weightForm.date,
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

				// setUserWeights(data)
				setUserWeights(
					data
						.sort((a: WeightEntry, b: WeightEntry) => +new Date(a.date) - +new Date(b.date))
						.slice(-6)
						.map(({ date, weight }: WeightEntry) => ({
							label: date.split('T')[0].slice(5),
							value: +weight,
							dataPointText: `${weight}`,
						}))
				);
			};

			fetchData();
			DATA.push({ value: 150 });
			setAddWeightModal(false);
		} catch (error) {
			console.error(error);
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
						Diff: {lastWeightEntry ? (lastWeightEntry.value - 150).toFixed(1) : '--'} lbs
					</Text>
				</View>
				<View className=" overflow-hidden py-2 h-40 mx-2 border-b-[1px] border-[#F1F5F9] border-solid">
					<LineChart
						color={'#E3BBA1'}
						data={userWeights}
						curved
						textColor={'white'}
						color2={'transparent'}
						thickness={3}
						xAxisLabelTextStyle={{ color: 'transparent', fontSize: 12 }}
						yAxisTextStyle={{ color: 'white', fontSize: 12 }}
						hideYAxisText
						isAnimated
						animationDuration={2500} // Duration of the animation in milliseconds (1.5 seconds)
						animateOnDataChange={false} // Set to true if you want animation when data updates later
						// Optional: Customize animation type (easeOutQuad, linear, etc.)
						// animationEasing="easeOutQuad"
						// make the chart fit vertically
						hideAxesAndRules
						focusEnabled // Enables the focus functionality
						showDataPointOnFocus // Shows a visual indicator on the focused data point
						showDataPointLabelOnFocus // Shows a label/value on the focused data point
						// Optional: Customize the appearance of the focused data point
						focusedDataPointShape="circle"
						focusedDataPointWidth={15}
						focusedDataPointHeight={15}
						focusedDataPointColor="red" // Color of the focused data point indicator
						focusedDataPointRadius={6}
						// Optional: Customize the label that appears on focus
						pointerConfig={{
							pointerLabelComponent: (item: any) => {
								return (
									<View className=" w-10 absolute top-0 h-8 flex jusitfy-center items-center mt-4">
										<Text className="text-xs color-[#64748B] font-JakartaSemiBold">
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
						dataPointLabelShiftY={-20} // Adjust position of the label above the point
						dataPointLabelShiftX={-5}
						yAxisOffset={calculateYAxisOffset(userWeights)}
						hideDataPoints
						data2={DATA}
					/>
				</View>
				<View className="flex flex-row justify-between py-4">
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Starting</Text>
						<Text className="text-sm">168.8 lbs</Text>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Change</Text>
						<Text className="text-sm text-[#E3BBA1]">
							{lastWeightEntry ? (168.8 - lastWeightEntry.value).toFixed(1) : '--'} lbs
						</Text>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Target</Text>
						<Text className="text-sm">150.0 lbs</Text>
					</View>
				</View>

				{lastWeightEntry?.label === todayDate ? null : (
					<CustomButton onPress={handleAddWeightModal} title="Log Today's Weight" />
				)}

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
