import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'

const Onboarding = () => {
    return (
        <SafeAreaView className='bg-red-200 h-full items-center justify-between'>
            <Text className="text-4xl  ">Onboarding hello Page</Text>
        </SafeAreaView>
    )
}

export default Onboarding;