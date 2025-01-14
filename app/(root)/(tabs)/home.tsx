import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { View, Text , Image , ScrollView} from 'react-native';
import { images } from '@/constants/index'

export default function Page() {
  const { user } = useUser()

  return (
    <View>
      <SignedIn>
        <ScrollView className='bg-[#262135] w-full h-full  '>
            <View className=' w-full  pt-14 px-8'>
                <Text className='text-white text-4xl font-JakartaSemiBold'>
                    Hi,{'\n'}
                    Will
                </Text>
                <View className='w-full h-60  mt-4 relative'>
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