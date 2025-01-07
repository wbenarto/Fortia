import { ScrollView, View, Text, Image } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { images, icons } from '@/constants';
import InputField from '@/components/InputField';
import OAuth from '@/components/OAuth'
import CustomButton from '@/components/CustomButton';

const SignUp = () => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    })

    const onSignUpPress = async () => {

    }

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
                    <InputField
                        label='Email'
                        placeholder='Enter your Email'
                        icon={icons.Email}
                        value={form.email}
                        onChangeText={(value)=> setForm({...form, email: value})}
                    />
                    <InputField
                        label='Password'
                        placeholder='Enter your Password'
                        icon={icons.Lock}
                        secureTextEntry={true}
                        value={form.password}
                        onChangeText={(value)=> setForm({...form, password: value})}
                    />

                    <CustomButton title='Sign Up' onPress={onSignUpPress} className="mt-6" width="100%" />

                    <OAuth />

                    <Link href="/sign-in" className="text-lg text-center text-general-200 mt-10">
                        <Text>Already have an account?{" "}</Text>
                        <Text className='text-primary-500'>Log In</Text>
                    </Link>
                </View>

                {/* Verification Modal */}
            </View>
        </ScrollView>
    )
}

export default SignUp;