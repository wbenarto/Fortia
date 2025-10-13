import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	Alert,
	TextInput,
	Linking,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from './CustomButton';
import DataConsentModal from './DataConsentModal';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { useGoalsStore } from '@/store';
import { useRouter } from 'expo-router';
import { calculateBMR, calculateTDEE } from '@/lib/bmrUtils';
import { calculateBodyFatPercentage } from '@/lib/bodyFatUtils';
import { getTodayDate } from '@/lib/dateUtils';
import { fetchDataConsent, storeDataConsent, hasDataCollectionConsent } from '@/lib/consentUtils';

interface OnboardingFormProps {
	onComplete: () => void;
}

interface FormData {
	username: string;
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
		username: '',
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
	const [isCheckingUserStatus, setIsCheckingUserStatus] = useState(true);
	const [targetWeightError, setTargetWeightError] = useState<string | null>(null);
	const [usernameError, setUsernameError] = useState<string | null>(null);
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

	const { user } = useUser();
	const { triggerGoalsUpdate } = useGoalsStore();
	const router = useRouter();

	// Check user's existing consent and onboarding status on component mount
	useEffect(() => {
		if (user?.id && !consentChecked) {
			checkUserStatusAndConsent();
		}
	}, [user?.id, consentChecked]);

	const checkUserStatusAndConsent = async () => {
		if (!user?.id) return;

		try {
			// First check if user is already onboarded
			const userResponse = await fetchAPI(`/api/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (userResponse.success && userResponse.data) {
				// Check if user has completed onboarding (has weight, height, fitness_goal)
				const hasCompletedOnboarding = !!(
					userResponse.data.weight &&
					userResponse.data.height &&
					userResponse.data.fitness_goal
				);

				if (hasCompletedOnboarding) {
					router.push('/(root)/(tabs)/home');
					return;
				}
			}

			// If not onboarded, check consent
			const consentData = await fetchDataConsent(user.id);
			setUserConsentData(consentData);
			setConsentChecked(true);

			// If user has no consent data, show consent modal
			if (!consentData) {
				setDataConsentModal(true);
			}
		} catch (error) {
			console.error('Failed to check user status and consent:', error);
			setConsentChecked(true);
		} finally {
			setIsCheckingUserStatus(false);
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
		setFormData(prev => {
			const newData = { ...prev, [field]: value };

			// Real-time validation for target weight
			if (field === 'targetWeight' || field === 'weight' || field === 'fitnessGoal') {
				const error = validateTargetWeight(
					newData.weight,
					newData.targetWeight,
					newData.fitnessGoal
				);
				setTargetWeightError(error);
			}

			return newData;
		});
	};

	const validateTargetWeight = (
		currentWeight: string,
		targetWeight: string,
		fitnessGoal: string
	): string | null => {
		// Only validate if we have all required data
		if (!currentWeight.trim() || !targetWeight.trim() || !fitnessGoal) {
			return null;
		}

		const current = parseFloat(currentWeight);
		const target = parseFloat(targetWeight);

		// Check if both values are valid numbers
		if (isNaN(current) || isNaN(target)) {
			return null;
		}

		// Validate based on fitness goal
		if (fitnessGoal === 'lose_weight') {
			if (target >= current) {
				return 'For weight loss, target weight must be less than current weight';
			}
		} else if (fitnessGoal === 'gain_muscle') {
			if (target <= current) {
				return 'For muscle gain, target weight should be higher than current weight';
			}
		}

		return null;
	};

	// Debounced username availability check
	const checkUsernameAvailability = useCallback(async (username: string) => {
		if (!username.trim() || username.length < 4) {
			setUsernameError('Username must be at least 4 characters long');
			setUsernameAvailable(false);
			return;
		}

		// Basic username validation
		const usernameRegex = /^[a-zA-Z0-9_]+$/;
		if (!usernameRegex.test(username)) {
			setUsernameError('Username can only contain letters, numbers, and underscores');
			setUsernameAvailable(false);
			return;
		}

		setIsCheckingUsername(true);
		setUsernameError(null);

		try {
			const response = await fetchAPI(
				`/api/user/check-username?username=${encodeURIComponent(username.toLowerCase())}`,
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
		if (!formData.username.trim()) {
			setUsernameError(null);
			setUsernameAvailable(null);
			return;
		}

		const timeoutId = setTimeout(() => {
			checkUsernameAvailability(formData.username);
		}, 500); // 500ms debounce

		return () => clearTimeout(timeoutId);
	}, [formData.username, checkUsernameAvailability]);

	const validateForm = (): boolean => {
		// Check if user has provided consent for data collection
		if (!hasDataCollectionConsent(userConsentData)) {
			Alert.alert('Error', 'Please provide consent for data collection');
			setDataConsentModal(true);
			return false;
		}

		// Validate username
		if (!formData.username.trim()) {
			Alert.alert('Error', 'Please enter a username');
			return false;
		}

		if (usernameError || !usernameAvailable) {
			Alert.alert('Error', 'Please choose a valid and available username');
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

			// Calculate body fat percentage
			const bodyFatPercentage = calculateBodyFatPercentage(
				weight,
				heightInches,
				age,
				formData.gender
			);

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

			// Create complete user with all information
			const requestBody = {
				clerkId: user.id,
				username: formData.username.toLowerCase(),
				firstName: user.firstName || '',
				lastName: user.lastName || '',
				email: user.emailAddresses[0]?.emailAddress || '',
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
				bodyFatPercentage,
			};

			// Create user with complete information
			const response = await fetchAPI('/api/user', {
				method: 'POST',
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
						console.error('Failed to log initial weight:', weightError);
					}
				}

				// Update goals store
				triggerGoalsUpdate();

				// Navigate to home immediately after successful creation

				router.push('/(root)/(tabs)/home');

				// Show success message after navigation
				setTimeout(() => {
					Alert.alert(
						'Welcome to Fortia!',
						'Your profile has been set up successfully. You can now start tracking your fitness journey.'
					);
				}, 500);
			} else {
				Alert.alert('Error', response.error || 'Failed to create user profile. Please try again.');
			}
		} catch (error) {
			console.error('Onboarding form error:', error);
			Alert.alert('Error', 'Failed to create user profile. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Show loading state while checking user status
	if (isCheckingUserStatus) {
		return (
			<View className="flex-1 justify-center items-center bg-[#262135]">
				<Text className="text-black text-lg">Loading...</Text>
			</View>
		);
	}

	return (
		<LinearGradient
			colors={['#ffffff', '#f0dec9']}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			className="flex-1"
		>
			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
			>
				<ScrollView
					className="flex-1 px-10"
					contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View className="py-6">
						<Text className="text-black text-2xl font-JakartaSemiBold mb-2">
							Complete Your Profile
						</Text>
						<Text className="text-gray-600 text-base mb-6">
							Help us create your personalized fitness plan
						</Text>

						{/* Username */}
						<View className="mb-6">
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">
								Choose a Username <Text className="text-red-500">*</Text>
							</Text>
							<View className="relative">
								<InputField
									placeholder="Enter your username"
									value={formData.username}
									onChangeText={value => updateFormData('username', value)}
									className={`bg-white h-12 rounded-lg pr-12 ${
										usernameError
											? 'border-2 border-red-400'
											: usernameAvailable
												? 'border-2 border-green-400'
												: !formData.username.trim()
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
										✓ {formData.username.toLowerCase()} is available!
									</Text>
								</View>
							)}
							{!formData.username.trim() && !usernameError && (
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

						{/* Date of Birth */}
						<View className="mb-6">
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">Date of Birth</Text>
							<View className="flex-row space-x-3">
								<View className="flex-1">
									<Text className="text-gray-600 text-sm mb-2">Month</Text>
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
									<Text className="text-gray-600 text-sm mb-2">Day</Text>
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
									<Text className="text-gray-600 text-sm mb-2">Year</Text>
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
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">
								Current Weight (lbs)
							</Text>
							<InputField
								placeholder="Enter your current weight"
								keyboardType="numeric"
								value={formData.weight}
								onChangeText={value => updateFormData('weight', value)}
								className="bg-white border-b-0 h-12 rounded-lg"
							/>
						</View>

						{/* Height */}
						<View className="mb-6">
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">Height</Text>
							<View className="flex-row" style={{ gap: 12 }}>
								<View style={{ flex: 1 }}>
									<InputField
										placeholder="Feet"
										keyboardType="numeric"
										value={formData.heightFeet}
										onChangeText={value => updateFormData('heightFeet', value)}
										className="bg-white border-b-0 h-12 rounded-lg"
									/>
								</View>
								<View style={{ flex: 1 }}>
									<InputField
										placeholder="Inches"
										keyboardType="numeric"
										value={formData.heightInches}
										onChangeText={value => updateFormData('heightInches', value)}
										className="bg-white border-b-0 h-12 rounded-lg"
									/>
								</View>
							</View>
						</View>

						{/* Gender */}
						<View className="mb-6">
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">Gender</Text>
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
												formData.gender === gender.key ? 'text-black' : 'text-gray-700'
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
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">Fitness Goal</Text>
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
														formData.fitnessGoal === goal.key ? 'text-black' : 'text-gray-700'
													}`}
												>
													{goal.title}
												</Text>
												<Text
													className={`text-sm ${
														formData.fitnessGoal === goal.key ? 'text-black' : 'text-gray-500'
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
							<Text className="text-black text-lg font-JakartaSemiBold mb-3">
								Target Weight (lbs)
							</Text>
							<InputField
								placeholder="Enter your target weight"
								keyboardType="numeric"
								value={formData.targetWeight}
								onChangeText={value => updateFormData('targetWeight', value)}
								className={`bg-white h-12 rounded-lg ${
									targetWeightError ? 'border-2 border-red-400' : 'border border-gray-200'
								}`}
							/>
							{targetWeightError && (
								<View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
									<Text className="text-red-600 text-sm">{targetWeightError}</Text>
								</View>
							)}
						</View>

						{/* Submit Button */}
						<CustomButton
							title={isSubmitting ? 'Setting up your plan...' : 'Complete Setup'}
							onPress={() => {
								if (
									!isSubmitting &&
									!targetWeightError &&
									!usernameError &&
									usernameAvailable &&
									formData.username.trim()
								) {
									handleSubmit();
								}
							}}
							className="mb-6"
							disabled={
								isSubmitting ||
								!!targetWeightError ||
								!!usernameError ||
								!usernameAvailable ||
								!formData.username.trim()
							}
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
			</KeyboardAvoidingView>
		</LinearGradient>
	);
};

export default OnboardingForm;
