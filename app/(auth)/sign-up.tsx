import { ScrollView, View, Text, Image, TextInput, Button, Alert } from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { useSignUp } from '@clerk/clerk-expo';
import { images, icons } from '@/constants';
import InputField from '@/components/InputField';
import OAuth from '@/components/OAuth';
import CustomButton from '@/components/CustomButton';
import ReactNativeModal from 'react-native-modal';
import { fetchAPI } from '@/lib/fetch';

const SignUp = () => {
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
	});
	const [verification, setVerification] = useState({
		state: 'default',
		error: '',
		code: '',
	});
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const router = useRouter();
	const { isLoaded, signUp, setActive } = useSignUp();

	const onSignUpPress = async () => {
		if (!isLoaded) return;

		// Validate form fields
		if (
			!form.firstName.trim() ||
			!form.lastName.trim() ||
			!form.email.trim() ||
			!form.password.trim()
		) {
			Alert.alert('Error', 'Please fill in all fields');
			return;
		}

		// Start sign-up process using email and password provided
		try {
			await signUp.create({
				emailAddress: form.email,
				password: form.password,
			});

			// Send user an email with verification code
			await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

			// Set 'pendingVerification' to true to display second form
			// and capture OTP code
			setVerification({
				...verification,
				state: 'pending',
			});
		} catch (err: any) {
			Alert.alert('Error', err.errors[0].longMessage);
		}
	};

	// Handle submission of verification form
	const onVerifyPress = async () => {
		if (!isLoaded) return;

		try {
			// Use the code the user provided to attempt verification
			const signUpAttempt = await signUp.attemptEmailAddressVerification({
				code: verification.code,
			});

			// If verification was completed, set the session to active
			// and redirect the user
			if (signUpAttempt.status === 'complete') {
				try {
					// Create database user
					const userResponse = await fetchAPI('/(api)/user', {
						method: 'POST',
						body: JSON.stringify({
							firstName: form.firstName,
							lastName: form.lastName,
							email: form.email,
							clerkId: signUpAttempt.createdUserId,
						}),
					});

					if (userResponse.success) {
						await setActive({ session: signUpAttempt.createdSessionId });
						setVerification({
							...verification,
							state: 'success',
						});
					} else {
						// Handle specific error cases
						if (userResponse.error && userResponse.error.includes('already exists')) {
							// User already exists, try to sign them in instead
							await setActive({ session: signUpAttempt.createdSessionId });
							setVerification({
								...verification,
								state: 'success',
							});
						} else {
							throw new Error(userResponse.error || 'Failed to create user');
						}
					}
				} catch (userError: any) {
					console.error('User creation error:', userError);

					// If it's a 409 conflict (user already exists), proceed anyway
					if (userError.message && userError.message.includes('409')) {
						await setActive({ session: signUpAttempt.createdSessionId });
						setVerification({
							...verification,
							state: 'success',
						});
					} else {
						throw userError;
					}
				}
			} else {
				// If the status is not complete, check why. User may need to
				// complete further steps.
				setVerification({
					...verification,
					state: 'failed',
				});
			}
		} catch (err: any) {
			// See https://clerk.com/docs/custom-flows/error-handling
			// for more info on error handling
			console.error('Verification error:', JSON.stringify(err, null, 2));
			setVerification({
				...verification,
				error: err.errors?.[0]?.longMessage || err.message || 'Verification failed',
				state: 'failed',
			});
		}
	};
	return (
		<ScrollView className="flex-1 bg-[#262135]">
			<View className="flex-1">
				<View className="bg-white w-full h-[250px] overflow-hidden relative">
					<Image source={images.SignUp} className="z-0 h-[250px] object-fill w-full " />

					<Text className="absolute text-white text-2xl font-JakartaSemiBold bottom-5 left-5">
						Create Your Account
					</Text>
				</View>
				<View className="p-5">
					<InputField
						className=""
						inputStyle="text-sm"
						label="First Name"
						placeholder="Enter your first name"
						icon={icons.Person}
						value={form.firstName}
						onChangeText={value => setForm({ ...form, firstName: value })}
						labelStyle="text-white"
					/>
					<InputField
						label="Last Name"
						placeholder="Enter your last name"
						icon={icons.Person}
						value={form.lastName}
						onChangeText={value => setForm({ ...form, lastName: value })}
						labelStyle="text-white"
					/>
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

					<CustomButton title="Sign Up" onPress={onSignUpPress} className="mt-6" width="100%" />

					<OAuth />

					<Link href="/sign-in" className="text-lg text-center text-general-200 mt-10">
						<Text>Already have an account? </Text>
						<Text className="text-primary-500">Log In</Text>
					</Link>
				</View>

				{/* Verification Modal */}
				<ReactNativeModal
					isVisible={verification.state === 'pending'}
					onModalHide={() => {
						if (verification.state === 'success') setShowSuccessModal(true);
					}}
				>
					<View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
						<Text className="text-2xl font-JakartaExtraBold mb-2">
							We've sent a verification code to {form.email}
						</Text>
						<InputField
							label="code"
							icon={icons.Lock}
							placeholder="12345"
							value={verification.code}
							keyboardType="numeric"
							onChangeText={code => setVerification({ ...verification, code })}
						/>
						{verification.error && (
							<Text className="text-red-500 text-sm mt-1">{verification.error}</Text>
						)}
						<CustomButton
							title="Verify Email"
							onPress={onVerifyPress}
							className="mt-5 bg-success-500"
						/>
					</View>
				</ReactNativeModal>

				<ReactNativeModal isVisible={showSuccessModal}>
					<View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
						<Image source={images.Check} className="w-[110px] h-[110px] mx-auto my-5" />
						<Text className="text-3xl font-JakartaBold text-center">Verified</Text>
						<Text className="text-base text-gray-400 font-Jakarta text-center mt-2">
							You have successfully verified your account.
						</Text>
						<CustomButton
							title="Complete Setup"
							onPress={() => router.replace('/(auth)/onboarding-setup')}
							className="mt-5"
						/>
					</View>
				</ReactNativeModal>
			</View>
		</ScrollView>
	);
};

export default SignUp;
