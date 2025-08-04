import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import CustomButton from './CustomButton';
import DataConsentModal from './DataConsentModal';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { useGoalsStore } from '@/store';
import { useRouter } from 'expo-router';
import { calculateBMR, calculateTDEE } from '@/lib/bmrUtils';
import { getTodayDate } from '@/lib/dateUtils';
import { fetchDataConsent, storeDataConsent, hasDataCollectionConsent } from '@/lib/consentUtils';

interface OnboardingFormProps {
	onComplete: () => void;
}

interface FormData {
	dobMonth: string;
	dobDay: string;
	dobYear: string;
	weight: string;
	heightFeet: string;
	heightInches: string;
	gender: string;
	fitnessGoal: string;
	targetWeight: string;
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ onComplete }) => {
	const [formData, setFormData] = useState<FormData>({
		dobMonth: '',
		dobDay: '',
		dobYear: '',
		weight: '',
		heightFeet: '',
		heightInches: '',
		gender: '',
		fitnessGoal: '',
		targetWeight: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [dataConsentModal, setDataConsentModal] = useState(false);
	const [userConsentData, setUserConsentData] = useState<any>(null);
	const [consentChecked, setConsentChecked] = useState(false);

	const { user } = useUser();
	const { triggerGoalsUpdate } = useGoalsStore();
	const router = useRouter();

	// Check user's existing consent on component mount
	useEffect(() => {
		if (user?.id && !consentChecked) {
			checkExistingConsent();
		}
	}, [user?.id, consentChecked]);

	const checkExistingConsent = async () => {
		if (!user?.id) return;

		try {
			const consentData = await fetchDataConsent(user.id);
			setUserConsentData(consentData);
			setConsentChecked(true);

			// If user has no consent data, show consent modal
			if (!consentData) {
				setDataConsentModal(true);
			}
		} catch (error) {
			console.error('Failed to check existing consent:', error);
			setConsentChecked(true);
		}
	};

	const fitnessGoals = [
		{
			key: 'lose_weight',
			title: 'Lose Weight',
			description: 'Create a calorie deficit to lose fat',
			icon: '📉',
		},
		{
			key: 'gain_muscle',
			title: 'Gain Muscle',
			description: 'Build muscle mass and strength',
			icon: '💪',
		},
		{
			key: 'maintain',
			title: 'Maintain Weight',
			description: 'Keep current weight and body composition',
			icon: '⚖️',
		},
		{
			key: 'improve_fitness',
			title: 'Improve Fitness',
			description: 'Enhance overall fitness and health',
			icon: '🏆',
		},
	];

	const genders = [
		{ key: 'male', label: 'Male' },
		{ key: 'female', label: 'Female' },
		{ key: 'other', label: 'Other' },
	];

	const updateFormData = (field: keyof FormData, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const validateForm = (): boolean => {
		// Check if user has provided consent for data collection
		if (!hasDataCollectionConsent(userConsentData)) {
			Alert.alert('Error', 'Please provide consent for data collection');
			setDataConsentModal(true);
			return false;
		}

		// Validate required form fields
		if (!formData.dobMonth.trim() || !formData.dobDay.trim() || !formData.dobYear.trim()) {
			Alert.alert('Error', 'Please enter your complete date of birth');
			return false;
		}

		// Validate date of birth
		const month = parseInt(formData.dobMonth);
		const day = parseInt(formData.dobDay);
		const year = parseInt(formData.dobYear);

		if (isNaN(month) || isNaN(day) || isNaN(year)) {
			Alert.alert('Error', 'Please enter valid numbers for date of birth');
			return false;
		}

		if (month < 1 || month > 12) {
			Alert.alert('Error', 'Please enter a valid month (1-12)');
			return false;
		}

		if (day < 1 || day > 31) {
			Alert.alert('Error', 'Please enter a valid day (1-31)');
			return false;
		}

		// Check for valid date (accounting for different month lengths)
		const date = new Date(year, month - 1, day);
		if (date.getMonth() !== month - 1 || date.getDate() !== day || date.getFullYear() !== year) {
			Alert.alert('Error', 'Please enter a valid date of birth');
			return false;
		}

		// Check if date is in the future
		const today = new Date();
		if (date > today) {
			Alert.alert('Error', 'Date of birth cannot be in the future');
			return false;
		}

		// Check if user is too young (under 13) or too old (over 120)
		const age = today.getFullYear() - year;
		if (age < 13) {
			Alert.alert('Error', 'You must be at least 13 years old to use this app');
			return false;
		}
		if (age > 120) {
			Alert.alert('Error', 'Please enter a valid date of birth');
			return false;
		}

		// Validate weight
		if (!formData.weight.trim()) {
			Alert.alert('Error', 'Please enter your current weight');
			return false;
		}

		const weight = parseFloat(formData.weight);
		if (isNaN(weight) || weight <= 0) {
			Alert.alert('Error', 'Please enter a valid weight');
			return false;
		}

		if (weight < 50 || weight > 500) {
			Alert.alert('Error', 'Please enter a realistic weight (50-500 lbs)');
			return false;
		}

		// Validate height
		if (!formData.heightFeet.trim() || !formData.heightInches.trim()) {
			Alert.alert('Error', 'Please enter your height');
			return false;
		}

		const heightFeet = parseInt(formData.heightFeet);
		const heightInches = parseInt(formData.heightInches);

		if (isNaN(heightFeet) || isNaN(heightInches)) {
			Alert.alert('Error', 'Please enter valid numbers for height');
			return false;
		}

		if (heightFeet < 3 || heightFeet > 8) {
			Alert.alert('Error', 'Please enter a realistic height (3-8 feet)');
			return false;
		}

		if (heightInches < 0 || heightInches > 11) {
			Alert.alert('Error', 'Please enter a valid number of inches (0-11)');
			return false;
		}

		const totalHeightInches = heightFeet * 12 + heightInches;
		if (totalHeightInches < 36 || totalHeightInches > 96) {
			Alert.alert('Error', 'Please enter a realistic height (3-8 feet)');
			return false;
		}

		// Validate gender
		if (!formData.gender) {
			Alert.alert('Error', 'Please select your gender');
			return false;
		}

		// Validate fitness goal
		if (!formData.fitnessGoal) {
			Alert.alert('Error', 'Please select your fitness goal');
			return false;
		}

		// Validate target weight
		if (!formData.targetWeight.trim()) {
			Alert.alert('Error', 'Please enter your target weight');
			return false;
		}

		const targetWeight = parseFloat(formData.targetWeight);
		if (isNaN(targetWeight) || targetWeight <= 0) {
			Alert.alert('Error', 'Please enter a valid target weight');
			return false;
		}

		if (targetWeight < 50 || targetWeight > 500) {
			Alert.alert('Error', 'Please enter a realistic target weight (50-500 lbs)');
			return false;
		}

		// Check if target weight is too different from current weight
		const weightDifference = Math.abs(targetWeight - weight);
		if (weightDifference > 200) {
			Alert.alert('Error', 'Target weight should be within 200 lbs of your current weight');
			return false;
		}

		return true;
	};

	const convertHeightToInches = (feet: string, inches: string): number => {
		return parseInt(feet) * 12 + parseInt(inches);
	};

	const convertInchesToCm = (inches: number): number => {
		return inches * 2.54; // 1 inch = 2.54 cm
	};

	const calculateAge = (month: string, day: string, year: string): number => {
		const today = new Date();
		const dob = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
		let age = today.getFullYear() - dob.getFullYear();
		const monthDiff = today.getMonth() - dob.getMonth();

		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
			age--;
		}

		return age;
	};

	const handleSubmit = async () => {
		if (!validateForm() || !user?.id) return;

		setIsSubmitting(true);

		try {
			// Check if user has consented to data collection
			if (!hasDataCollectionConsent(userConsentData)) {
				Alert.alert('Error', 'Please provide consent for data collection to continue');
				setDataConsentModal(true);
				return;
			}

			const age = calculateAge(formData.dobMonth, formData.dobDay, formData.dobYear);
			const heightInches = convertHeightToInches(formData.heightFeet, formData.heightInches);
			const heightCm = convertInchesToCm(heightInches);
			const weight = parseFloat(formData.weight);
			const targetWeight = parseFloat(formData.targetWeight);

			// Calculate BMR and TDEE
			const bmr = Math.round(calculateBMR(weight, heightCm, age, formData.gender));
			const tdee = calculateTDEE(bmr, 'moderate'); // Default to moderate activity

			// Calculate daily calories and macros based on fitness goal
			let dailyCalories = tdee;
			switch (formData.fitnessGoal) {
				case 'lose_weight':
					dailyCalories = Math.round(tdee * 0.8); // 20% deficit
					break;
				case 'gain_muscle':
				case 'improve_fitness':
					dailyCalories = Math.round(tdee * 0.9); // 10% deficit
					break;
				case 'maintain':
				default:
					dailyCalories = Math.round(tdee);
					break;
			}

			// Calculate macros (25% protein, 45% carbs, 30% fats)
			const dailyProtein = Math.round((dailyCalories * 0.25) / 4);
			const dailyCarbs = Math.round((dailyCalories * 0.45) / 4);
			const dailyFats = Math.round((dailyCalories * 0.3) / 9);

			// Format date as YYYY-MM-DD
			const dob = `${formData.dobYear}-${formData.dobMonth.padStart(2, '0')}-${formData.dobDay.padStart(2, '0')}`;

			// Update user with onboarding information
			const requestBody = {
				clerkId: user.id,
				dob,
				age,
				weight,
				startingWeight: weight, // Set starting weight to current weight during onboarding
				targetWeight,
				height: heightCm,
				gender: formData.gender,
				activityLevel: 'moderate',
				fitnessGoal: formData.fitnessGoal,
				dailyCalories,
				dailyProtein,
				dailyCarbs,
				dailyFats,
				bmr,
				tdee,
			};

			const response = await fetchAPI('/api/user', {
				method: 'PUT',
				body: JSON.stringify(requestBody),
			});

			if (response.success) {
				// Log the user's weight to the weights table if data collection is consented
				if (hasDataCollectionConsent(userConsentData)) {
					try {
						const todayDate = getTodayDate();

						const weightResponse = await fetchAPI('/api/weight', {
							method: 'POST',
							body: JSON.stringify({
								weight: weight.toString(),
								date: todayDate,
								clerkId: user.id,
							}),
						});

						if (!weightResponse.data) {
							console.warn('Weight logging failed, but onboarding completed');
						}
					} catch (weightError) {
						console.error('Error logging weight:', weightError);
						// Don't fail onboarding if weight logging fails
					}
				}

				triggerGoalsUpdate();
				onComplete();
				router.replace('/(root)/(tabs)/home');
			} else {
				console.error('Onboarding failed:', response.error);
				Alert.alert('Error', response.error || 'Failed to save your information');
			}
		} catch (error) {
			console.error('Onboarding form error:', error);
			Alert.alert('Error', 'Failed to save your information. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<ScrollView className="flex-1 bg-[#262135] px-5">
			<View className="py-6">
				<Text className="text-white text-2xl font-JakartaSemiBold mb-2">Complete Your Profile</Text>
				<Text className="text-gray-400 text-base mb-6">
					Help us create your personalized fitness plan
				</Text>

				{/* Date of Birth */}
				<View className="mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-3">Date of Birth</Text>
					<View className="flex-row space-x-3">
						<View className="flex-1">
							<Text className="text-gray-400 text-sm mb-2">Month</Text>
							<TextInput
								className="bg-white rounded-lg p-4 border border-gray-200 text-gray-700"
								placeholder="MM"
								placeholderTextColor="#9CA3AF"
								value={formData.dobMonth}
								onChangeText={(value: string) => updateFormData('dobMonth', value)}
								keyboardType="numeric"
								maxLength={2}
							/>
						</View>
						<View className="flex-1">
							<Text className="text-gray-400 text-sm mb-2">Day</Text>
							<TextInput
								className="bg-white rounded-lg p-4 border border-gray-200 text-gray-700"
								placeholder="DD"
								placeholderTextColor="#9CA3AF"
								value={formData.dobDay}
								onChangeText={(value: string) => updateFormData('dobDay', value)}
								keyboardType="numeric"
								maxLength={2}
							/>
						</View>
						<View className="flex-1">
							<Text className="text-gray-400 text-sm mb-2">Year</Text>
							<TextInput
								className="bg-white rounded-lg p-4 border border-gray-200 text-gray-700"
								placeholder="YYYY"
								placeholderTextColor="#9CA3AF"
								value={formData.dobYear}
								onChangeText={(value: string) => updateFormData('dobYear', value)}
								keyboardType="numeric"
								maxLength={4}
							/>
						</View>
					</View>
				</View>

				{/* Current Weight */}
				<View className="mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-3">Current Weight (lbs)</Text>
					<InputField
						placeholder="Enter your current weight"
						keyboardType="numeric"
						value={formData.weight}
						onChangeText={value => updateFormData('weight', value)}
						className="bg-white"
					/>
				</View>

				{/* Height */}
				<View className="mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-3">Height</Text>
					<View className="flex-row" style={{ gap: 12 }}>
						<View style={{ flex: 1 }}>
							<InputField
								placeholder="Feet"
								keyboardType="numeric"
								value={formData.heightFeet}
								onChangeText={value => updateFormData('heightFeet', value)}
								className="bg-white"
							/>
						</View>
						<View style={{ flex: 1 }}>
							<InputField
								placeholder="Inches"
								keyboardType="numeric"
								value={formData.heightInches}
								onChangeText={value => updateFormData('heightInches', value)}
								className="bg-white"
							/>
						</View>
					</View>
				</View>

				{/* Gender */}
				<View className="mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-3">Gender</Text>
					<View style={{ gap: 8 }}>
						{genders.map(gender => (
							<TouchableOpacity
								key={gender.key}
								onPress={() => updateFormData('gender', gender.key)}
								className={`p-4 rounded-lg border ${
									formData.gender === gender.key
										? 'bg-[#E3BBA1] border-[#E3BBA1]'
										: 'bg-white border-gray-200'
								}`}
							>
								<Text
									className={`font-JakartaSemiBold ${
										formData.gender === gender.key ? 'text-white' : 'text-gray-700'
									}`}
								>
									{gender.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Fitness Goal */}
				<View className="mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-3">Fitness Goal</Text>
					<View style={{ gap: 8 }}>
						{fitnessGoals.map(goal => (
							<TouchableOpacity
								key={goal.key}
								onPress={() => updateFormData('fitnessGoal', goal.key)}
								className={`p-4 rounded-lg border ${
									formData.fitnessGoal === goal.key
										? 'bg-[#E3BBA1] border-[#E3BBA1]'
										: 'bg-white border-gray-200'
								}`}
							>
								<View className="flex-row items-center">
									<Text className="text-2xl mr-3">{goal.icon}</Text>
									<View className="flex-1">
										<Text
											className={`font-JakartaSemiBold ${
												formData.fitnessGoal === goal.key ? 'text-white' : 'text-gray-700'
											}`}
										>
											{goal.title}
										</Text>
										<Text
											className={`text-sm ${
												formData.fitnessGoal === goal.key ? 'text-white' : 'text-gray-500'
											}`}
										>
											{goal.description}
										</Text>
									</View>
								</View>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Target Weight */}
				<View className="mb-6">
					<Text className="text-white text-lg font-JakartaSemiBold mb-3">Target Weight (lbs)</Text>
					<InputField
						placeholder="Enter your target weight"
						keyboardType="numeric"
						value={formData.targetWeight}
						onChangeText={value => updateFormData('targetWeight', value)}
						className="bg-white"
					/>
				</View>

				{/* Submit Button */}
				<CustomButton
					title={isSubmitting ? 'Setting up your plan...' : 'Complete Setup'}
					onPress={() => {
						if (!isSubmitting) {
							handleSubmit();
						}
					}}
					className="mb-6"
				/>
			</View>

			{/* Data Consent Modal */}
			<DataConsentModal
				isVisible={dataConsentModal}
				onClose={() => setDataConsentModal(false)}
				onConsent={async () => {
					if (user?.id) {
						// Refresh consent data
						const updatedConsent = await fetchDataConsent(user.id);
						setUserConsentData(updatedConsent);
						setDataConsentModal(false);
					}
				}}
				clerkId={user?.id || ''}
			/>
		</ScrollView>
	);
};

export default OnboardingForm;
