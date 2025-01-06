import { ScrollView, View, Text, Image } from 'react-native';
import { images, icons } from '@/constants';
import InputField from '@/components/InputField'
import { useState } from 'react'

const SignUp = () => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    })

    return (
        <ScrollView className='flex-1 bg-[#262135]'>
            <View className='flex-1'>
                <View className='bg-white w-full h-[250px] overflow-hidden relative'>
                    <Image source={images.SignUp} className='z-0 h-[250px] object-fill w-full ' />
                    
                    <Text className='absolute text-white text-2xl font-JakartaSemiBold bottom-5 left-5'>Create Your Account</Text>
                </View>
                <View className='p-5'>
                    <InputField
                        label='Name'
                        placeholder='Enter your name'
                        icon={icons.Person}
                        value={form.name}
                        onChangeText={(value)=> setForm({...form, name: value})}
                    />
                </View>
            </View>
        </ScrollView>
    )
}

export default SignUp;