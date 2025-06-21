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

const WeightTracking = () => {
	const [userWeights, setUserWeights] = useState<any[]>([]);
	const [addWeightModal, setAddWeightModal] = useState(false);
	const [weightForm, setWeightForm] = useState({
		weight: '',
		date: new Date(),
	});
	const [showDatePicker, setShowDatePicker] = useState(false);

	const { user } = useUser();

	const DATA = [
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
		{ value: 150 },
	];

	const { getToken } = useAuth();

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
				console.log('useFocusEffect');

				const data = response.data;
				// setUserWeights(data)
				setUserWeights(
					data
						.sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date))
						.slice(-6)
						.map(({ date, weight }) => ({
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

	const onChange = (event, selectedDate: any) => {
		console.log('selectedDate; ', selectedDate);
		console.log('weightform date state', weightForm.date);
		setShowDatePicker(false);

		if (selectedDate) {
			setWeightForm({ ...weightForm, date: selectedDate });
		}
	};

	const handleWeightSubmission = async () => {
		console.log('ello', weightForm, user);

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
						.sort((a: any, b: any) => +new Date(a.date) - +new Date(b.date))
						.slice(-6)
						.map(({ date, weight }) => ({
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
			<View className="flex flex-row justify-between px-4">
				<Text className="font-JakartaSemibold ">Weight Progress</Text>
				<Text className="text-[#E3BBA1] text-xs font-JakartaSemibold">-2.2 lbs this week</Text>
			</View>
			<View className=" pb-6 px-4 m-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="py-6 flex flex-row justify-between items-end ">
					<Text>
						<Text className="font-JakartaBold text-2xl">157.0</Text>{' '}
						<Text className="text-[#64748B]">lbs</Text>
					</Text>
					<Text className="text-xs text-[#64748B]">Target: 150 lbs</Text>
				</View>
				<View className=" overflow-hidden mx-2 border-b-[1px] border-[#F1F5F9] border-solid">
					<LineChart
						color={'#E3BBA1'}
						data={userWeights}
						height={120}
						initialSpacing={0}
						curved
						textColor={'white'}
						color2={'transparent'}
						thickness={3}
						xAxisLabelTextStyle={{ color: 'transparent', fontSize: 12 }}
						yAxisTextStyle={{ color: 'white', fontSize: 12 }}
						hideYAxisText
						isAnimated
						hideAxesAndRules
						yAxisOffset={160}
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
						<Text className="text-sm text-[#E3BBA1]">-2.2 lbs</Text>
					</View>
					<View className="flex justify-center items-center gap-1 ">
						<Text className="text-xs text-[#64748B]">Target</Text>
						<Text className="text-sm">168.8 lbs</Text>
					</View>
				</View>
				<CustomButton onPress={handleWeightSubmission} title="Log Today's Weight" />
			</View>
		</View>
		// <View className="relative bg-[#A6D0E4] p-4 mx-1 rounded-2xl">
		// 	{/* <WeeklyTracking /> */}

		// 	<View className="flex-row justify-between items-center">
		// 		<Text className="text-2xl font-JakartaBold text-black">Weight Tracking</Text>
		// 		<TouchableOpacity
		// 			onPress={handleAddWeightModal}
		// 			className="bg-cyan-600 px-4 py-2 rounded-full"
		// 		>
		// 			<Text className="text-white font-JakartaSemiBold">Log Weight</Text>
		// 		</TouchableOpacity>
		// 	</View>

		// 	<View className="w-full overflow-hidden rounded-xl ">
		// 		<View className="bg-sky-200 rounded-3xl w-[50%] h-40 items-center flex justify-between my-4">
		// 			<Text className="text-gray-600 font-JakartaSemiBold text-lg pt-4">Weight</Text>
		// 			<Text className="text-black font-JakartaBold text-3xl mb-2">165.2 lbs</Text>

		// 			<Text className="pb-4">
		// 				{(userWeights[userWeights.length - 1]?.value - DATA[0].value).toFixed(2)} lbs from goal
		// 			</Text>
		// 		</View>
		// 		<ReactNativeModal
		// 			isVisible={addWeightModal}
		// 			onBackdropPress={() => setAddWeightModal(false)}
		// 		>
		// 			<View className="bg-white py-10 px-4 mx-10 rounded-md">
		// 				<View className="pb-10 ">
		// 					<Text className="text-xl text-center font-JakartaSemiBold">Log your weight</Text>
		// 				</View>

		// 				<View className="flex mx-auto w-full justify-center">
		// 					{/* <DateTimePicker
		// 						value={weightForm.date}
		// 						mode="date"
		// 						display="default"
		// 						onChange={onChange}
		// 					/> */}

		// 					<InputField
		// 						label=""
		// 						placeholder="Enter your weight"
		// 						keyboardType="numeric"
		// 						value={weightForm.weight}
		// 						className="text-center flex p-4 "
		// 						onChangeText={value => setWeightForm({ ...weightForm, weight: value })}
		// 					/>
		// 				</View>
		// 				<View className="">
		// 					<Text className="text-lg text-center font-JakartaSemiBold">lbs</Text>
		// 				</View>

		// 				<CustomButton onPress={handleWeightSubmission} title="Save" />
		// 			</View>
		// 		</ReactNativeModal>

		// 		{/* {userWeights.map((e,i) => {
		//                             return (
		//                                 <View key={i} className='flex flex-row gap-4'>
		//                                     <Text >{e.date.split('T')[0]}</Text>
		//                                     <Text className='text-black'>{e.weight}</Text>
		//                                 </View>
		//                             )
		//                         })} */}
		// 	</View>

		// 	{/* <Image source={images.Chart} className='object-contain w-full h-full' resizeMode='contain' /> */}
		// </View>
	);
};

export default WeightTracking;
