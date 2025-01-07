import { View , Text, Image } from 'react-native';
import { icons } from '@/constants/index';
import CustomButton from '@/components/CustomButton';

const OAuth = () => {

    const handleGoogleSignIn = async () => {

    }
    return ( 
        <View>
            <View className='flex flex-row justify-center items-center mt-4 gap-x-3'>
                <View className='flex-1 h-[1px] bg-general-100'></View>
                <Text className='text-lg text-white'>Or</Text>
                <View className='flex-1 h-[1px] bg-general-100'></View>
            </View>

            <CustomButton 
                title='Log In with Google'
                className='mt-5 w-full shadow-none'
                IconLeft={()=>(
                    <Image source={icons.Google} 
                        resizeMode='contain'
                        className="w-5 h-5 mx-2"
                    />
                )}
                bgVariant='outline' 
                onPress={handleGoogleSignIn}
            />
        </View>
    )
}

export default OAuth;