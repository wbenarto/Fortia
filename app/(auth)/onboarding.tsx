import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-swiper';
import { useRef, useState } from 'react';
import { onboardingPages } from '@/constants';
import CustomButton from '@/components/CustomButton';

const Onboarding = () => {
	const swiperRef = useRef<Swiper>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const isLastSlide = activeIndex === onboardingPages.length - 1;
	return (
		<SafeAreaView className="h-full bg-white">
			{/* Background Image */}
			<Image
				source={require('@/assets/images/half-dome.jpg')}
				className="absolute left-0 mt-[-100px] h-screen w-[60%]"
				resizeMode="cover"
			/>

			{/* Content */}
			<View className="flex-1 items-center justify-between">
				<TouchableOpacity
					onPress={() => {
						router.replace('/(auth)/sign-up');
					}}
					className="w-full flex justify-end items-end p-5"
				>
					<Text className="text-[#e3bba1] text-md font-JakartaBold ">Skip</Text>
				</TouchableOpacity>

				<Swiper
					ref={swiperRef}
					loop={false}
					dot={<View className="w-[32px] h-[4px] mx-1 bg-secondary-400" />}
					activeDot={<View className="w-[32px] h-[4px] mx-1 bg-[#e3bba1] rounded-full" />}
					onIndexChanged={index => setActiveIndex(index)}
				>
					{onboardingPages.map(e => {
						return (
							<View key={e.id} className="flex items-center justify-center p-5 ">
								<Image
									source={e.image}
									className={`w-full  h-[300px] rounded-md ${e.image == '17' ? 'mt-[30%]' : ''}`}
									resizeMode="contain"
								/>
								<View
									className={`flex flex-row items-center justify-center w-full mt-10 {${e.image} == '' ? mb-20 : mb-6`}
								>
									<Text className="text-[#e3bba1] text-3xl font-bold mx-10 text-center">
										{e.title}
									</Text>
								</View>

								<Text className="text-base font-JakartaSemiBold text-center text-secondary-700  mx-10 mt-3">
									{e.description}
								</Text>
							</View>
						);
					})}
				</Swiper>

				<CustomButton
					title={isLastSlide ? 'Get Started' : 'Next'}
					className="w-11/12 mt-10"
					width="80%"
					onPress={() =>
						isLastSlide ? router.replace('/(auth)/sign-up') : swiperRef.current?.scrollBy(1)
					}
				/>
			</View>
		</SafeAreaView>
	);
};

export default Onboarding;
