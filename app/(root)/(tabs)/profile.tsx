import { View, Text , Image , ScrollView , TouchableOpacity} from 'react-native';
import { images } from '@/constants/index'
import { useAuth ,useUser } from '@clerk/clerk-expo'
import { router } from 'expo-router'

const Profile = () => {
    const { signOut } = useAuth()
    
    const { user } = useUser()

    const handleSignOut = () => {
        signOut()
        router.replace("/(auth)/sign-in")
    }
    return (
        <View className='bg-[#262135] w-full h-full text-white '>
            
            <View className='w-full my-14 h-80 justify-center items-center'>
                <TouchableOpacity onPress={handleSignOut} className='flex w-full ml-auto pr-8 mb-8'>
                    <Text className='text-white text-right'>Sign Out</Text>
                </TouchableOpacity>
                <View className='w-[200px] h-[200px] mx-auto rounded-full bg-white border-8 border-yellow-400 mb-6'>
                    {/* Profile Photo */}
                </View>
                <Text className='font-JakartaSemiBold text-3xl text-white'>{user?.firstName} {user?.lastName}</Text>
            </View>

            <View className='px-8'>
                <Text className='text-white font-JakartaSemiBold text-lg mb-4'>
                    App Settings
                </Text>
                <View className='w-full  bg-[#494358] rounded-[30px]'>
                    <View className=' h-20 w-[90%] mx-auto flex flex-row justify-between px-4 items-center border-b-2 border-gray-400 '>
                        <Text className='font-JakartaSemiBold text-white' >Account Informations</Text>
                        <Text className='font-JakartaSemiBold text-white'>></Text>
                    </View>
                    <View className=' h-20 w-[90%] mx-auto flex flex-row justify-between px-4 items-center border-b-2 border-gray-400 '>
                        <Text className='font-JakartaSemiBold text-white' >Subscriptions</Text>
                        <Text className='font-JakartaSemiBold text-white'>></Text>
                    </View>
                    <View className=' h-20 w-[90%] mx-auto flex flex-row justify-between px-4 items-center '>
                        <Text className='font-JakartaSemiBold text-white' >Terms of Service</Text>
                        <Text className='font-JakartaSemiBold text-white'>></Text>
                    </View>

                </View>
            </View>
            
          
        </View>
    )
}

export default Profile;