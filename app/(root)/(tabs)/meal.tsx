import { View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import ReactNativeModal from 'react-native-modal';


const Meal = () => {
    const [ addMealModal, setAddMealModal ] = useState(false)

    return (

        <View className='my-20 mx-8'>
            <Text className='text-xl font-bold'>
                Meal Log: Today
            </Text>
            <Text>
                1. Oat milk latte 
            </Text>
            <Text>
                2. Chicken breast fried rice z
            </Text>
            <Text>
                Total Calories : 636
            </Text>
            <Text>Goal : 2,040</Text>
            <TouchableOpacity className='p-4 bg-emerald-700 rounded-lg my-4 ' onPress={()=>setAddMealModal(!addMealModal)}>
                <Text className='text-center font-JakartaSemiBold text-white'>Add Meal</Text>
            </TouchableOpacity>

            <ReactNativeModal 
                isVisible={addMealModal}
                onBackdropPress={()=> setAddMealModal(false)}
                backdropColor="transparent"
                className='bg-red-100'
            >
                
                <View className='bg-gray-300 px-20 h-80 rounded-[30px]'>
                    <View className='flex flex-row gap-10 bg-red-100 '>
                      
                    </View>
                    
                    <Text>
                        Name
                    </Text>
                    <Text>
                        Weight
                    </Text>
                </View>

            </ReactNativeModal>
        </View>
    )
}

export default Meal