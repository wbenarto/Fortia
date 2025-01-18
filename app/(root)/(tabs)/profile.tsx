import { View, Text , Image , ScrollView , TouchableOpacity} from 'react-native';
import { images } from '@/constants/index'
import { useAuth } from '@clerk/clerk-expo'
import { router } from 'expo-router'

const Profile = () => {
    const { signOut } = useAuth()

    const handleSignOut = () => {
        signOut()
        router.replace("/(auth)/sign-in")
    }
    return (
        <View className='bg-[#262135] w-full h-full '>
            <Text className='text-white pt-20 text-4xl'>Profile</Text>
            <TouchableOpacity onPress={handleSignOut} className='p-2  flex w-40 justify-center items-center  '>
                <Text className='text-white '>Sign Out</Text></TouchableOpacity>
          
        </View>
    )
}

export default Profile;