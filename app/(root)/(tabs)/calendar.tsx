import { View, Text } from 'react-native'

const Calendar = () => {
    return (
        <View className='bg-[#262135] w-full h-full text-white py-20 px-4 '>
            <Text className='text-white text-xl'>TODAY IS</Text>
            <Text className='text-white text-4xl font-JakartaSemiBold'>Feb 4, 2025</Text>

            <View className='mt-80 bg-white h-full rounded-[40px]'>
                <Text className='text-center mt-10 font-JakartaBold text-2xl my-8'>
                    Your Schedule
                </Text>

                <View className='h-32 w-[80%] bg-red-100 rounded-[20px] ml-auto mr-4 mb-8 p-6'>
                    <Text>February 5 - 8am</Text>
                    <Text className='my-2 text-lg font-JakartaSemiBold'>Back/Pull Day</Text>
                    <Text className=''>Lat Pulldown - 12 x 4 sets</Text>
                </View>
                <View className='h-32 w-[80%] bg-yellow-100 rounded-[20px] ml-auto mr-4 mr-4 mb-8 p-6'>
                    <Text>February 8 - 7am</Text>
                    <Text className='my-2 text-lg font-JakartaSemiBold'>Leg & Bicep Day</Text>
                    <Text className=''>Leg Press - 12 x 4 sets</Text>
                </View>
            </View>
        </View>
    )
}

export default Calendar