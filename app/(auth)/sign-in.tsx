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
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const { signIn, setActive, isLoaded } = useSignIn();

	const onSignInPress = useCallback(async () => {
		if (!isLoaded) return;

		// Clear any previous errors
		setError(null);
		setIsLoading(true);

		// Basic validation
		if (!form.email.trim() || !form.password.trim()) {
			setError('Please enter both email and password');
			setIsLoading(false);
			return;
		}

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
				console.error('Sign in incomplete, status:', signInAttempt.status);
				setError('Sign in process incomplete. Please try again.');
			}
		} catch (err: any) {
			// Handle specific Clerk errors with user-friendly messages
			let errorMessage = 'Sign in failed. Please try again.';

			if (err.errors && err.errors.length > 0) {
				const error = err.errors[0];

				// Handle specific error codes
				switch (error.code) {
					case 'form_identifier_not_found':
						errorMessage = 'No account found with this email address.';
						break;
					case 'form_password_incorrect':
						errorMessage = 'Incorrect password. Please try again.';
						break;
					case 'form_identifier_exists':
						errorMessage = 'An account with this email already exists.';
						break;
					case 'form_password_pwned':
						errorMessage =
							'This password has been compromised. Please choose a different password.';
						break;
					case 'form_password_too_short':
						errorMessage = 'Password is too short.';
						break;
					case 'form_password_too_weak':
						errorMessage = 'Password is too weak. Please choose a stronger password.';
						break;
					default:
						errorMessage = error.longMessage || error.message || errorMessage;
				}
			}

			// Only log non-user errors (like network issues) to console
			// Don't log expected authentication errors
			if (
				err.errors?.[0]?.code !== 'form_password_incorrect' &&
				err.errors?.[0]?.code !== 'form_identifier_not_found'
			) {
				console.error('Sign in error:', err.errors?.[0]?.code || 'Unknown error');
			}

			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [isLoaded, form.email, form.password, signIn, setActive, router]);

	return (
		<ScrollView className="flex-1 ">
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
						onChangeText={value => {
							setForm({ ...form, email: value });
							// Clear error when user starts typing
							if (error) setError(null);
						}}
						labelStyle="text-black"
					/>
					<InputField
						label="Password"
						placeholder="Enter your Password"
						icon={icons.Lock}
						secureTextEntry={true}
						value={form.password}
						onChangeText={value => {
							setForm({ ...form, password: value });
							// Clear error when user starts typing
							if (error) setError(null);
						}}
						labelStyle="text-black"
					/>

					{/* Error Message */}
					{error && (
						<View className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
							<Text className="text-red-600 text-sm text-center">{error}</Text>
						</View>
					)}

					<CustomButton
						title={isLoading ? 'Signing In...' : 'Sign In'}
						onPress={onSignInPress}
						className="mt-6"
						width="100%"
						disabled={isLoading}
					/>

					<OAuth />

					<Link href="/sign-up" className="text-base text-center text-general-200 mt-10">
						<Text>Don't have an account? </Text>
						<Text className="text-primary-500">Sign Up</Text>
					</Link>
				</View>
			</View>
		</ScrollView>
	);
};

export default SignIn;
