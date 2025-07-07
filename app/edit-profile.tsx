import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	ActivityIndicator,
	TextInput,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '../lib/fetch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { triggerUserProfileRefresh } from '../lib/userUtils';

interface UserProfile {
	clerkId: string;
	firstName: string;
	lastName: string;
	dob: string;
	age: number;
	height: number;
	targetWeight: number;
	fitnessGoal: string;
	weight: number;
	gender: string;
	activityLevel: string;
	dailyCalories: number;
	dailyProtein: number;
	dailyCarbs: number;
	dailyFats: number;
	bmr: number;
	tdee: number;
	startingWeight: number;
}

const EditProfile = () => {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<EditProfileContent />
		</>
	);
};

const EditProfileContent = () => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [profile, setProfile] = useState<UserProfile | null>(null);

	// Form state
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [dobMonth, setDobMonth] = useState('');
	const [dobDay, setDobDay] = useState('');
	const [dobYear, setDobYear] = useState('');
	const [heightFeet, setHeightFeet] = useState('');
	const [heightInches, setHeightInches] = useState('');

	useEffect(() => {
		if (user?.id) {
			fetchUserProfile();
		}
	}, [user?.id]);

	const fetchUserProfile = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		try {
			const response = await fetchAPI(`/(api)/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				const userData = response.data;
				setProfile(userData);

				// Populate form fields
				setFirstName(userData['first_name'] || user?.firstName || '');
				setLastName(userData['last_name'] || user?.lastName || '');

				// Parse DOB
				if (userData.dob) {
					const dobDate = new Date(userData.dob);
					setDobMonth((dobDate.getMonth() + 1).toString().padStart(2, '0'));
					setDobDay(dobDate.getDate().toString().padStart(2, '0'));
					setDobYear(dobDate.getFullYear().toString());
				}

				// Parse height
				if (userData.height) {
					const totalInches = userData.height / 2.54;
					const feet = Math.floor(totalInches / 12);
					const inches = Math.round(totalInches % 12);
					setHeightFeet(feet.toString());
					setHeightInches(inches.toString());
				}
			}
		} catch (error) {
			console.error('Failed to fetch user profile:', error);
			Alert.alert('Error', 'Failed to load profile data');
		} finally {
			setIsLoading(false);
		}
	};

	const calculateAge = (month: string, day: string, year: string): number => {
		if (!month || !day || !year) return 0;

		const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}

		return age;
	};

	const convertFeetInchesToCm = (feet: string, inches: string): number => {
		const totalInches = (parseInt(feet) || 0) * 12 + (parseInt(inches) || 0);
		return totalInches * 2.54;
	};

	const validateForm = (): boolean => {
		if (!firstName.trim()) {
			Alert.alert('Error', 'First name is required');
			return false;
		}
		if (!lastName.trim()) {
			Alert.alert('Error', 'Last name is required');
			return false;
		}
		if (!dobMonth || !dobDay || !dobYear) {
			Alert.alert('Error', 'Date of birth is required');
			return false;
		}
		if (!heightFeet || !heightInches) {
			Alert.alert('Error', 'Height is required');
			return false;
		}
		return true;
	};

	const handleSave = async () => {
		if (!validateForm() || !user?.id) return;

		setIsSaving(true);
		try {
			const age = calculateAge(dobMonth, dobDay, dobYear);
			const heightCm = convertFeetInchesToCm(heightFeet, heightInches);
			// Format date as YYYY-MM-DD for database DATE type
			const dob = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;

			const response = await fetchAPI(`/(api)/user`, {
				method: 'PUT',
				body: JSON.stringify({
					clerkId: user.id,
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					dob,
					age: Number(age),
					height: Number(heightCm),
				}),
			});

			if (response.success) {
				// Trigger refresh of user profile data across the app
				triggerUserProfileRefresh();
				Alert.alert('Success', 'Profile updated successfully', [
					{ text: 'OK', onPress: () => router.back() },
				]);
			} else {
				Alert.alert('Error', response.error || 'Failed to update profile');
			}
		} catch (error) {
			console.error('Failed to update profile:', error);
			Alert.alert('Error', 'Failed to update profile');
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<View className="flex-1 bg-[#262135] justify-center items-center">
				<ActivityIndicator size="large" color="#E3BBA1" />
				<Text className="text-white mt-4 text-lg">Loading profile...</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-[#262135]" style={{ paddingTop: insets.top }}>
			{/* Header */}
			<View className="flex-row items-center justify-between p-4 border-b border-gray-700">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#E3BBA1" />
				</TouchableOpacity>
				<Text className="text-white text-lg font-JakartaSemiBold">Edit Profile</Text>
				<TouchableOpacity onPress={handleSave} disabled={isSaving}>
					<Text className="text-[#E3BBA1] font-JakartaSemiBold">
						{isSaving ? 'Saving...' : 'Save'}
					</Text>
				</TouchableOpacity>
			</View>

			<ScrollView className="flex-1 p-4">
				{/* Personal Information */}
				<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-4">Personal Information</Text>

					{/* First Name */}
					<View className="mb-4">
						<Text className="text-gray-300 text-sm font-JakartaMedium mb-2">First Name</Text>
						<View className="bg-[#262135] rounded-xl p-4">
							<TextInput
								value={firstName}
								onChangeText={setFirstName}
								placeholder="Enter first name"
								placeholderTextColor="#666"
								className="text-white font-JakartaMedium text-base"
								style={{ color: '#FFFFFF' }}
							/>
						</View>
					</View>

					{/* Last Name */}
					<View className="mb-4">
						<Text className="text-gray-300 text-sm font-JakartaMedium mb-2">Last Name</Text>
						<View className="bg-[#262135] rounded-xl p-4">
							<TextInput
								value={lastName}
								onChangeText={setLastName}
								placeholder="Enter last name"
								placeholderTextColor="#666"
								className="text-white font-JakartaMedium text-base"
								style={{ color: '#FFFFFF' }}
							/>
						</View>
					</View>

					{/* Date of Birth */}
					<View className="mb-4">
						<Text className="text-gray-300 text-sm font-JakartaMedium mb-2">Date of Birth</Text>
						<View className="flex-row space-x-2">
							<View className="flex-1 bg-[#262135] rounded-xl p-4">
								<TextInput
									value={dobMonth}
									onChangeText={setDobMonth}
									placeholder="MM"
									placeholderTextColor="#666"
									maxLength={2}
									keyboardType="numeric"
									className="text-white font-JakartaMedium text-base"
									style={{ color: '#FFFFFF', textAlign: 'center' }}
								/>
							</View>
							<View className="flex-1 bg-[#262135] rounded-xl p-4">
								<TextInput
									value={dobDay}
									onChangeText={setDobDay}
									placeholder="DD"
									placeholderTextColor="#666"
									maxLength={2}
									keyboardType="numeric"
									className="text-white font-JakartaMedium text-base"
									style={{ color: '#FFFFFF', textAlign: 'center' }}
								/>
							</View>
							<View className="flex-1 bg-[#262135] rounded-xl p-4">
								<TextInput
									value={dobYear}
									onChangeText={setDobYear}
									placeholder="YYYY"
									placeholderTextColor="#666"
									maxLength={4}
									keyboardType="numeric"
									className="text-white font-JakartaMedium text-base"
									style={{ color: '#FFFFFF', textAlign: 'center' }}
								/>
							</View>
						</View>
						{dobMonth && dobDay && dobYear && (
							<Text className="text-[#E3BBA1] text-sm mt-2">
								Age: {calculateAge(dobMonth, dobDay, dobYear)} years old
							</Text>
						)}
					</View>

					{/* Height */}
					<View className="mb-4">
						<Text className="text-gray-300 text-sm font-JakartaMedium mb-2">Height</Text>
						<View className="flex-row space-x-2">
							<View className="flex-1 bg-[#262135] rounded-xl p-4">
								<TextInput
									value={heightFeet}
									onChangeText={setHeightFeet}
									placeholder="Feet"
									placeholderTextColor="#666"
									maxLength={1}
									keyboardType="numeric"
									className="text-white font-JakartaMedium text-base"
									style={{ color: '#FFFFFF', textAlign: 'center' }}
								/>
							</View>
							<View className="flex-1 bg-[#262135] rounded-xl p-4">
								<TextInput
									value={heightInches}
									onChangeText={setHeightInches}
									placeholder="Inches"
									placeholderTextColor="#666"
									maxLength={2}
									keyboardType="numeric"
									className="text-white font-JakartaMedium text-base"
									style={{ color: '#FFFFFF', textAlign: 'center' }}
								/>
							</View>
						</View>
					</View>
				</View>
			</ScrollView>
		</View>
	);
};

export default EditProfile;
