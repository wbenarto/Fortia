import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { View, Text , Image , ScrollView, TouchableOpacity } from 'react-native';
import InputField from '@/components/InputField';
import { FontAwesome } from '@expo/vector-icons'
import { images } from '@/constants/index'
import ReactNativeModal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import CustomButton from '@/components/CustomButton';
import { fetchAPI } from '@/lib/fetch';

export default function Page() {
    const [addWeightModal, setAddWeightModal] = useState(false)
    const [ showDatePicker, setShowDatePicker ] = useState(false)
    const [ weightForm, setWeightForm ] = useState({
        weight: '',
        date: new Date()
    })

    const { user } = useUser()
    console.log(user)

    const handleAddWeightModal = () => (
        setAddWeightModal(!addWeightModal)
    )

    const onChange = (event, selectedDate: any) => {
        console.log('selectedDate; ', selectedDate)
        console.log('weightform date state', weightForm.date)
        setShowDatePicker(false);
      
        if (selectedDate) {
          setWeightForm({...weightForm, date: selectedDate});
        }
    };

    const handleWeightSubmission = async () => {
        console.log('ello', weightForm, user)

        try {
            await fetchAPI('/(api)/weight', {
                method: 'POST',
                body: JSON.stringify({
                    weight: weightForm.weight,
                    date: weightForm.date,
                    clerkId: user?.id
                })
            })

        } catch (error) {
            console.error(error)
        }

    }
    return (
        <View>
        <SignedIn>
            <ScrollView className='bg-[#262135] w-full h-full  '>
                <View className=' w-full  pt-14 px-8'>
                    <Text className='text-white text-4xl font-JakartaSemiBold'>
                        Hi,{'\n'}
                        {user?.firstName}
                    </Text>
                    <View className='w-full h-60  mt-4 relative'>
                        <TouchableOpacity onPress={handleAddWeightModal}>
                            <FontAwesome name='plus' size={40} color='white' className='flex-end flex bg-red-100'/>
                        </TouchableOpacity>
                        
                        <Image source={images.Chart} className='object-contain w-full h-full' resizeMode='contain' />

                    </View>
                </View>
                <View className='w-full  px-8 pb-40'>
                    <Text className='text-white text-3xl font-JakartaSemiBold mt-8'>
                        Your {'\n'}
                        Schedule
                    </Text>
                    <Text className='text-white mt-4'>
                        Today's Activity
                    </Text>
                    <View className='w-full '>
                        {/* Activity Component */}
                        <View className='h-20 my-2 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Bench Press</Text>
                                <Text className='text-gray-200 '>4 sets of 12</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View>
                        <View className='h-20 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Incline Dumbell Press</Text>
                                <Text className='text-gray-200 '>4 sets of 12</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View>
                        <View className='h-20 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Ball Shooting Drill</Text>
                                <Text className='text-gray-200 '>50 made threes</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View><View className='h-20 w-full rounded-[20px] items-center justify-between flex-row'>
                            <View className='w-14 h-14 rounded-full bg-yellow-100 flex justify-center items-center'>
                                <View className='w-4 h-4 rounded-full bg-black'>

                                </View>
                            </View>
                            <View className='ml-4'>
                                <Text className='text-gray-100 text-lg '>Tricep Dips</Text>
                                <Text className='text-gray-200 '>4 sets of 8</Text>
                            </View>
                            <View className='w-20 h-10 bg-yellow-100 rounded-full flex justify-center items-center ml-auto'>
                                <Text className='text-md font-JakartaExtraBold'>
                                    Start
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <ReactNativeModal isVisible={addWeightModal}
                    onBackdropPress={()=> setAddWeightModal(false)}
                    
                >
                    <View className='bg-white p-10 mx-10 rounded-md'>
                        <View className='pb-10 '>
                            <Text className='text-xl text-center font-JakartaSemiBold'>
                                Log your weight 
                            </Text>
                        </View>
                      
                        <View className='flex mx-auto'>
                       
                            <DateTimePicker value={weightForm.date} mode="date" display="default" onChange={onChange} />
                            
                            <InputField 
                                label=''
                                placeholder='Enter your weight'
                                keyboardType='numeric'
                                value={weightForm.weight}
                                className='text-center flex p-4'
                                onChangeText={(value)=> setWeightForm({...weightForm, weight: value})}
                            />
                            
                        </View>
                        <View className=''><Text className='text-lg text-center font-JakartaSemiBold'>lbs</Text></View>

                        <CustomButton onPress={handleWeightSubmission} title='Save'  />
                        
                        

                    </View>
                </ReactNativeModal>
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
  )
}