import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from "react-native-swiper";
import { useRef, useState } from 'react';
import { onboardingPages } from '@/constants';
import CustomButton from '@/components/CustomButton'

const Onboarding = () => {
    const swiperRef = useRef<Swiper>(null)
    const [activeIndex, setActiveIndex] = useState(0) 
    const isLastSlide = activeIndex === onboardingPages.length-1
    return (
        <SafeAreaView className='bg-[#262135] h-full items-center justify-between'>
            <TouchableOpacity 
            onPress={()=>{
                router.replace('/(auth)/sign-up')
            }}
            className='w-full flex justify-end items-end p-5'>
                <Text className="text-white text-md font-JakartaBold ">Skip</Text>
            </TouchableOpacity>

            <Swiper ref={swiperRef} loop={false} 
            dot={<View className='w-[32px] h-[4px] mx-1 bg-[#FFFFFF]' />}
            activeDot={<View className='w-[32px] h-[4px] mx-1 bg-[#F6F3BA] rounded-full' />} 
            onIndexChanged={(index) => setActiveIndex(index)}
            >
                {onboardingPages.map((e) => (
                    <View key={e.id} className='flex items-center justify-center p-5 mt-[10%]'>
                        <Image source={e.image}
                            className='w-full h-[300px]'
                            resizeMode='contain'
                        /> 
                        <View className='flex flex-row items-center justify-center w-full mt-10'>
                            <Text className='text-white text-3xl font-bold mx-10 text-center'>{e.title}</Text>
                        </View>
                        
                        <Text className='text-white text-lg font-JakartaSemiBold text-center text-[#858585] mx-10 mt-3'>{e.description}</Text>
                    </View>
                ))}
            </Swiper>

            <CustomButton 
                title={isLastSlide ? "Get Started" : "Next"}
                className='w-11/12 mt-10'
                onPress={()=> isLastSlide ? router.replace('/(auth)/sign-up') : swiperRef.current?.scrollBy(1)}
            />
            
        </SafeAreaView>
    )
}

export default Onboarding;