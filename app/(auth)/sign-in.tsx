import { ScrollView, View, Text, Image, Alert } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useState, useCallback } from 'react';
import { Link, useRouter } from 'expo-router';
import { images, icons } from '@/constants';
import InputField from '@/components/InputField';
import OAuth from '@/components/OAuth';
import CustomButton from '@/components/CustomButton';
import { fetchAPI } from '@/lib/fetch';

const SignIn = () => {
	const [form, setForm] = useState({
		email: '',
		password: '',
	});
	const router = useRouter();
	const { signIn, setActive, isLoaded } = useSignIn();

	const onSignInPress = useCallback(async () => {
		if (!isLoaded) return;

		// Start the sign-in process using the email and password provided
		try {
			const signInAttempt = await signIn.create({
				identifier: form.email,
				password: form.password,
			});

			// If sign-in process is complete, set the created session as active
			// and redirect the user
			if (signInAttempt.status === 'complete') {
				await setActive({ session: signInAttempt.createdSessionId });

				// Redirect to home, which will handle onboarding check
				router.replace('/');
			} else {
				// If the status isn't complete, check why. User might need to
				// complete further steps.
				console.error(JSON.stringify(signInAttempt, null, 2));
			}
		} catch (err: any) {
			// See https://clerk.com/docs/custom-flows/error-handling
			// for more info on error handling
			console.error(JSON.stringify(err, null, 2));
			Alert.alert('Error', err.errors?.[0]?.longMessage || 'Sign in failed');
		}
	}, [isLoaded, form.email, form.password]);

	return (
		<ScrollView className="flex-1 bg-[#262135]">
			<View className="flex-1">
				<View className="bg-white w-full h-[250px] overflow-hidden relative">
					<Image source={images.SignUp} className="z-0 h-[250px] object-fill w-full " />

					<Text className="absolute text-white text-2xl font-JakartaSemiBold bottom-5 left-5">
						Log In
					</Text>
				</View>
				<View className="p-5">
					<InputField
						label="Email"
						placeholder="Enter your Email"
						icon={icons.Email}
						value={form.email}
						onChangeText={value => setForm({ ...form, email: value })}
						labelStyle="text-white"
					/>
					<InputField
						label="Password"
						placeholder="Enter your Password"
						icon={icons.Lock}
						secureTextEntry={true}
						value={form.password}
						onChangeText={value => setForm({ ...form, password: value })}
						labelStyle="text-white"
					/>

					<CustomButton title="Sign In" onPress={onSignInPress} className="mt-6" width="100%" />

					<OAuth />

					<Link href="/sign-up" className="text-lg text-center text-general-200 mt-10">
						<Text>Don't have an account? </Text>
						<Text className="text-primary-500">Sign Up</Text>
					</Link>
				</View>
			</View>
		</ScrollView>
	);
};

export default SignIn;
