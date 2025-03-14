import { View , Text, Image, Alert } from 'react-native';
import { useCallback,} from 'react';
import { useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { icons } from '@/constants/index';
import CustomButton from '@/components/CustomButton';
import { googleOAuth } from '@/lib/auth';

const OAuth = () => {

    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' })

    const handleGoogleSignIn = useCallback(async () => {
        try {
            const result = await googleOAuth(startOAuthFlow) 

            if (result.code === 'session exists' || result.code === 'success') {
             
                router.push('/(root)/(tabs)/home')
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(err, null, 2))
        }
    }, [])

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