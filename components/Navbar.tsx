import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Navbar = () => {
    const insets = useSafeAreaInsets();

    return (
        <View className="left-0 right-0 bg-white shadow-md z-50" >
            <View className="bg-blue-100 items-center flex flex-row justify-between px-4">
                <View className='w-14 h-14 bg-[#E3BBA1] rounded-2xl'>

                </View>
                <Text className="text-lg">
                    Hi, William
                </Text>
                <View>
                    <Text>
                        icon
                    </Text>
                </View>
            </View>
        </View>
    )
}

export default Navbar;