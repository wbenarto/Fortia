import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from './InputField';
import CustomButton from './CustomButton';
import { fetchAPI } from '@/lib/fetch';

interface UsernameCollectionModalProps {
	isVisible: boolean;
	onClose: () => void;
	onSuccess: () => void;
	clerkId: string;
}

const UsernameCollectionModal: React.FC<UsernameCollectionModalProps> = ({
	isVisible,
	onClose,
	onSuccess,
	clerkId,
}) => {
	const [username, setUsername] = useState('');
	const [usernameError, setUsernameError] = useState<string | null>(null);
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Debounced username availability check
	const checkUsernameAvailability = useCallback(async (usernameValue: string) => {
		if (!usernameValue.trim() || usernameValue.length < 4) {
			setUsernameError('Username must be at least 4 characters long');
			setUsernameAvailable(false);
			return;
		}

		// Basic username validation
		const usernameRegex = /^[a-zA-Z0-9_]+$/;
		if (!usernameRegex.test(usernameValue)) {
			setUsernameError('Username can only contain letters, numbers, and underscores');
			setUsernameAvailable(false);
			return;
		}

		setIsCheckingUsername(true);
		setUsernameError(null);

		try {
			const response = await fetchAPI(
				`/api/user/check-username?username=${encodeURIComponent(usernameValue.toLowerCase())}`,
				{
					method: 'GET',
				}
			);

			if (response.success) {
				if (response.available) {
					setUsernameAvailable(true);
					setUsernameError(null);
				} else {
					setUsernameAvailable(false);
					setUsernameError('This username is already taken. Please choose another one.');
				}
			} else {
				setUsernameAvailable(false);
				setUsernameError('Unable to check username availability. Please try again.');
			}
		} catch (error) {
			console.error('Username check error:', error);
			setUsernameAvailable(false);
			setUsernameError('Unable to check username availability. Please try again.');
		} finally {
			setIsCheckingUsername(false);
		}
	}, []);

	// Debounce the username check
	useEffect(() => {
		if (!username.trim()) {
			setUsernameError(null);
			setUsernameAvailable(null);
			return;
		}

		const timeoutId = setTimeout(() => {
			checkUsernameAvailability(username);
		}, 500); // 500ms debounce

		return () => clearTimeout(timeoutId);
	}, [username, checkUsernameAvailability]);

	const handleSubmit = async () => {
		if (!username.trim()) {
			Alert.alert('Error', 'Please enter a username');
			return;
		}

		if (usernameError || !usernameAvailable) {
			Alert.alert('Error', 'Please choose a valid and available username');
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetchAPI('/api/user/update-username', {
				method: 'PUT',
				body: JSON.stringify({
					clerkId,
					username: username.toLowerCase(),
				}),
			});

			if (response.success) {
				Alert.alert('Success!', 'Your username has been set successfully.', [
					{
						text: 'OK',
						onPress: () => {
							onSuccess();
							onClose();
						},
					},
				]);
			} else {
				Alert.alert('Error', response.error || 'Failed to set username. Please try again.');
			}
		} catch (error) {
			console.error('Username update error:', error);
			Alert.alert('Error', 'Failed to set username. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		// Prevent closing - username is mandatory
		Alert.alert('Username Required', 'You must set a username to continue using Fortia.', [
			{ text: 'OK' },
		]);
	};

	return (
		<Modal visible={isVisible} animationType="fade" transparent={true} onRequestClose={handleClose}>
			<SafeAreaView className="flex-1">
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					className="flex-1"
				>
					<View className="flex-1 bg-black/50 justify-center items-center px-6">
						<LinearGradient
							colors={['#ffffff', '#f0dec9']}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							className="w-full max-w-md rounded-2xl p-6"
						>
							<View className="items-center mb-6">
								<Text className="text-black text-2xl font-JakartaSemiBold mb-2">
									Choose Your Username
								</Text>
								<Text className="text-gray-600 text-center text-base">
									Set up your unique username to continue using Fortia
								</Text>
							</View>

							<View className="mb-6">
								<Text className="text-black text-lg font-JakartaSemiBold mb-3">
									Username <Text className="text-red-500">*</Text>
								</Text>
								<View className="relative">
									<InputField
										placeholder="Enter your username"
										value={username}
										onChangeText={setUsername}
										className={`bg-white h-12 rounded-lg pr-12 ${
											usernameError
												? 'border-2 border-red-400'
												: usernameAvailable
													? 'border-2 border-green-400'
													: !username.trim()
														? 'border-2 border-orange-300'
														: 'border border-gray-200'
										}`}
										autoCapitalize="none"
										autoCorrect={false}
									/>
									{isCheckingUsername && (
										<View className="absolute right-3 top-5">
											<Text className="text-gray-400 text-sm">Checking...</Text>
										</View>
									)}
									{!isCheckingUsername && usernameAvailable && (
										<View className="absolute right-3 top-5">
											<Text className="text-green-500 text-lg">✓</Text>
										</View>
									)}
									{!isCheckingUsername && usernameError && (
										<View className="absolute right-3 top-5">
											<Text className="text-red-500 text-lg">✗</Text>
										</View>
									)}
								</View>
								{usernameError && (
									<View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
										<Text className="text-red-600 text-sm">{usernameError}</Text>
									</View>
								)}
								{!usernameError && usernameAvailable && (
									<View className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
										<Text className="text-green-600 text-sm">
											✓ {username.toLowerCase()} is available!
										</Text>
									</View>
								)}
								{!username.trim() && !usernameError && (
									<View className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
										<Text className="text-orange-600 text-sm">
											⚠️ Username is required to continue
										</Text>
									</View>
								)}
								<Text className="text-gray-500 text-xs mt-2">
									Username can contain letters, numbers, and underscores. Must be at least 4
									characters.
								</Text>
							</View>

							<View className="mt-6">
								<CustomButton
									title={isSubmitting ? 'Setting...' : 'Set Username'}
									onPress={handleSubmit}
									className="w-full"
									disabled={
										isSubmitting || !!usernameError || !usernameAvailable || !username.trim()
									}
								/>
							</View>
						</LinearGradient>
					</View>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</Modal>
	);
};

export default UsernameCollectionModal;
