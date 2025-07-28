import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '@/components/InputField';
import CustomButton from '@/components/CustomButton';

const ChangePassword = () => {
	const { user } = useUser();
	const [form, setForm] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<{
		currentPassword?: string;
		newPassword?: string;
		confirmPassword?: string;
		general?: string;
	}>({});
	const insets = useSafeAreaInsets();

	// Check if user can change password (has password-based auth)
	const canChangePassword = () => {
		if (!user) return false;

		// Check if user has password-based authentication
		// This is more reliable than checking email verification status
		// OAuth users will have verified emails but no password-based auth
		const hasPasswordAuth = user.passwordEnabled;

		return hasPasswordAuth;
	};

	const validateForm = () => {
		const newErrors: typeof errors = {};

		// Validate current password
		if (!form.currentPassword.trim()) {
			newErrors.currentPassword = 'Current password is required';
		}

		// Validate new password
		if (!form.newPassword.trim()) {
			newErrors.newPassword = 'New password is required';
		} else if (form.newPassword.length < 8) {
			newErrors.newPassword = 'Password must be at least 8 characters long';
		} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) {
			newErrors.newPassword =
				'Password must contain at least one uppercase letter, one lowercase letter, and one number';
		}

		// Validate confirm password
		if (!form.confirmPassword.trim()) {
			newErrors.confirmPassword = 'Please confirm your new password';
		} else if (form.newPassword !== form.confirmPassword) {
			newErrors.confirmPassword = 'Passwords do not match';
		}

		// Check if new password is same as current
		if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
			newErrors.newPassword = 'New password must be different from current password';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleChangePassword = useCallback(async () => {
		if (!user) {
			Alert.alert('Error', 'User not found');
			return;
		}

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);
		setErrors({});

		try {
			// Use Clerk's password change functionality
			// First, we need to verify the current password
			// Then update to the new password
			await user.updatePassword({
				currentPassword: form.currentPassword,
				newPassword: form.newPassword,
			});

			Alert.alert('Success', 'Your password has been updated successfully.', [
				{
					text: 'OK',
					onPress: () => {
						// Clear form and go back
						setForm({
							currentPassword: '',
							newPassword: '',
							confirmPassword: '',
						});
						router.back();
					},
				},
			]);
		} catch (err: any) {
			console.error('Password change error:', err);

			// Handle specific Clerk errors
			if (err.errors?.[0]?.code === 'form_identifier_not_found') {
				setErrors({ currentPassword: 'Current password is incorrect' });
			} else if (err.errors?.[0]?.code === 'form_password_pwned') {
				setErrors({
					newPassword: 'This password has been compromised. Please choose a different password.',
				});
			} else if (err.errors?.[0]?.code === 'form_password_too_short') {
				setErrors({ newPassword: 'Password is too short' });
			} else if (err.errors?.[0]?.code === 'form_password_too_weak') {
				setErrors({ newPassword: 'Password is too weak. Please choose a stronger password.' });
			} else {
				setErrors({
					general: err.errors?.[0]?.longMessage || 'Failed to update password. Please try again.',
				});
			}
		} finally {
			setIsLoading(false);
		}
	}, [user, form]);

	const handleBack = () => {
		router.back();
	};

	// If user cannot change password (OAuth only), show message and redirect
	if (!canChangePassword()) {
		return (
			<View className="flex-1 bg-[#262135]" style={{ paddingTop: insets.top }}>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={handleBack}>
						<Ionicons name="arrow-back" size={24} color="#E3BBA1" />
					</TouchableOpacity>
					<Text className="text-white text-lg font-JakartaSemiBold">Change Password</Text>
					<View style={{ width: 24 }} />
				</View>

				<View className="flex-1 justify-center items-center px-6">
					<View className="bg-[#2D2A3F] rounded-2xl p-8 max-w-sm">
						<View className="flex items-center mb-6">
							<Ionicons name="information-circle-outline" size={64} color="#E3BBA1" />
						</View>
						<Text className="text-white text-xl font-JakartaSemiBold text-center mb-4">
							Password Management
						</Text>
						<Text className="text-gray-400 text-center leading-6 mb-6">
							{user?.externalAccounts && user.externalAccounts.length > 0
								? `Your password is managed through your ${user.externalAccounts[0]?.provider} account. Please change your password there.`
								: 'Password changes are not available for your account type.'}
						</Text>
						<TouchableOpacity onPress={handleBack} className="bg-[#E3BBA1] rounded-xl py-4">
							<Text className="text-white text-center font-JakartaSemiBold">Go Back</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-[#262135]" style={{ paddingTop: insets.top }}>
			{/* Header */}
			<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
				<TouchableOpacity onPress={handleBack}>
					<Ionicons name="arrow-back" size={24} color="#E3BBA1" />
				</TouchableOpacity>
				<Text className="text-white text-lg font-JakartaSemiBold">Change Password</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView className="flex-1 px-6 py-4">
				{/* Info Card */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<View className="flex flex-row items-center mb-3">
						<Ionicons name="information-circle-outline" size={24} color="#E3BBA1" />
						<Text className="text-white font-JakartaSemiBold ml-2">Password Requirements</Text>
					</View>
					<View className="space-y-2">
						<Text className="text-gray-400 text-sm">• At least 8 characters long</Text>
						<Text className="text-gray-400 text-sm">
							• Contains uppercase and lowercase letters
						</Text>
						<Text className="text-gray-400 text-sm">• Contains at least one number</Text>
						<Text className="text-gray-400 text-sm">• Different from your current password</Text>
					</View>
				</View>

				{/* Form */}
				<View className="space-y-4">
					<InputField
						label="Current Password"
						placeholder="Enter your current password"
						value={form.currentPassword}
						onChangeText={value => {
							setForm({ ...form, currentPassword: value });
							if (errors.currentPassword) {
								setErrors({ ...errors, currentPassword: undefined });
							}
						}}
						secureTextEntry
						error={errors.currentPassword}
						labelStyle="text-white"
					/>

					<InputField
						label="New Password"
						placeholder="Enter your new password"
						value={form.newPassword}
						onChangeText={value => {
							setForm({ ...form, newPassword: value });
							if (errors.newPassword) {
								setErrors({ ...errors, newPassword: undefined });
							}
						}}
						secureTextEntry
						error={errors.newPassword}
						labelStyle="text-white"
					/>

					<InputField
						label="Confirm New Password"
						placeholder="Confirm your new password"
						value={form.confirmPassword}
						onChangeText={value => {
							setForm({ ...form, confirmPassword: value });
							if (errors.confirmPassword) {
								setErrors({ ...errors, confirmPassword: undefined });
							}
						}}
						secureTextEntry
						error={errors.confirmPassword}
						labelStyle="text-white"
					/>

					{/* General Error */}
					{errors.general && (
						<View className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
							<Text className="text-red-400 text-sm">{errors.general}</Text>
						</View>
					)}

					{/* Submit Button */}
					<View className="mt-6">
						<CustomButton
							title={isLoading ? 'Updating Password...' : 'Update Password'}
							onPress={handleChangePassword}
							disabled={isLoading}
							className="bg-[#E3BBA1]"
							width="100%"
						/>
					</View>

					{/* Cancel Button */}
					<TouchableOpacity
						onPress={handleBack}
						disabled={isLoading}
						className="mt-4 py-4 rounded-xl border border-gray-600"
					>
						<Text className="text-gray-400 text-center font-JakartaSemiBold">Cancel</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
};

export default ChangePassword;
