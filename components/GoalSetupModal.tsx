import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import CustomButton from './CustomButton';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';

interface GoalSetupModalProps {
	isVisible: boolean;
	onClose: () => void;
	onGoalsSet: () => void;
}

interface FormData {
	month: string;
	day: string;
	year: string;
	weight: string;
	targetWeight: string;
	heightFeet: string;
	heightInches: string;
	gender: string;
	activityLevel: string;
	fitnessGoal: string;
}

interface CalculatedGoals {
	daily_calories: number;
	daily_protein: number;
	daily_carbs: number;
	daily_fats: number;
	bmr: number;
	tdee: number;
}

interface ExistingNutritionGoals {
	id: string;
	userId: string;
	dob: string;
	age: number;
	weight: number;
	targetWeight: number;
	height: number;
	gender: string;
	activityLevel: string;
	fitnessGoal: string;
	daily_calories: number;
	daily_protein: number;
	daily_carbs: number;
	daily_fats: number;
	bmr: number;
	tdee: number;
	createdAt: string;
	updatedAt: string;
}

const GoalSetupModal: React.FC<GoalSetupModalProps> = ({ isVisible, onClose, onGoalsSet }) => {
	const [currentStep, setCurrentStep] = useState(1);
	const [formData, setFormData] = useState<FormData>({
		month: '',
		day: '',
		year: '',
		weight: '',
		targetWeight: '',
		heightFeet: '',
		heightInches: '',
		gender: '',
		activityLevel: '',
		fitnessGoal: '',
	});
	const [calculatedGoals, setCalculatedGoals] = useState<CalculatedGoals | null>(null);
	const [existingGoals, setExistingGoals] = useState<ExistingNutritionGoals | null>(null);
	const [isCalculating, setIsCalculating] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const { user } = useUser();

	// Fetch existing nutrition goals when modal opens
	useEffect(() => {
		if (isVisible && user?.id) {
			fetchExistingGoals();
		}
	}, [isVisible, user?.id]);

	const fetchExistingGoals = async () => {
		if (!user?.id) return;

		try {
			const response = await fetchAPI(`/(api)/nutrition-goals?userId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				setExistingGoals(response.data);
				populateFormWithExistingGoals(response.data);
			}
		} catch (error) {
			console.error('Failed to fetch existing goals:', error);
		}
	};

	const populateFormWithExistingGoals = (goals: ExistingNutritionGoals) => {
		// Parse DOB to extract month, day, year
		const dob = new Date(goals.dob);
		const month = (dob.getMonth() + 1).toString();
		const day = dob.getDate().toString();
		const year = dob.getFullYear().toString();

		// Convert height from cm to feet and inches
		const totalInches = goals.height / 2.54;
		const feet = Math.floor(totalInches / 12).toString();
		const inches = Math.round(totalInches % 12).toString();

		// Convert weight from kg to lbs with null checks
		const weightLbs = goals.weight ? Math.round(goals.weight * 2.20462).toString() : '';
		const targetWeightLbs = goals.targetWeight
			? Math.round(goals.targetWeight * 2.20462).toString()
			: '';

		setFormData({
			month,
			day,
			year,
			weight: weightLbs,
			targetWeight: targetWeightLbs,
			heightFeet: feet,
			heightInches: inches,
			gender: goals.gender,
			activityLevel: goals.activityLevel,
			fitnessGoal: goals.fitnessGoal,
		});
	};

	const activityLevels = [
		{
			key: 'sedentary',
			title: 'Sedentary',
			description: 'Little or no exercise, desk job',
			icon: '🛋️',
		},
		{
			key: 'light',
			title: 'Lightly Active',
			description: 'Light exercise 1-3 days/week',
			icon: '🚶',
		},
		{
			key: 'moderate',
			title: 'Moderately Active',
			description: 'Moderate exercise 3-5 days/week',
			icon: '🏃',
		},
		{
			key: 'active',
			title: 'Very Active',
			description: 'Hard exercise 6-7 days/week',
			icon: '💪',
		},
		{
			key: 'very_active',
			title: 'Extremely Active',
			description: 'Very hard exercise, physical job',
			icon: '🔥',
		},
	];

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

	const updateFormData = (field: keyof FormData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const formatDOB = (month: string, day: string, year: string): string => {
		const monthNum = month.padStart(2, '0');
		const dayNum = day.padStart(2, '0');
		return `${year}-${monthNum}-${dayNum}`;
	};

	const calculateAge = (month: string, day: string, year: string): number => {
		const dob = formatDOB(month, day, year);
		const birthDate = new Date(dob);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}

		return age;
	};

	const validateDOB = (month: string, day: string, year: string): boolean => {
		const monthNum = parseInt(month);
		const dayNum = parseInt(day);
		const yearNum = parseInt(year);

		// Check if all fields are filled
		if (!month || !day || !year) {
			return false;
		}

		// Check if values are numbers
		if (isNaN(monthNum) || isNaN(dayNum) || isNaN(yearNum)) {
			return false;
		}

		// Check month range
		if (monthNum < 1 || monthNum > 12) {
			return false;
		}

		// Check day range
		if (dayNum < 1 || dayNum > 31) {
			return false;
		}

		// Check year range
		const currentYear = new Date().getFullYear();
		if (yearNum < 1900 || yearNum > currentYear) {
			return false;
		}

		// Check if date is valid
		const dob = formatDOB(month, day, year);
		const birthDate = new Date(dob);
		if (isNaN(birthDate.getTime())) {
			return false;
		}

		// Check if date is not in the future
		const today = new Date();
		if (birthDate > today) {
			return false;
		}

		// Check if age is reasonable (between 13 and 120)
		const age = calculateAge(month, day, year);
		if (age < 13 || age > 120) {
			return false;
		}

		return true;
	};

	const convertWeightToKg = (weightLbs: string): number => {
		const lbs = parseFloat(weightLbs);
		return lbs * 0.453592; // Convert lbs to kg
	};

	const convertHeightToCm = (feet: string, inches: string): number => {
		const feetNum = parseFloat(feet);
		const inchesNum = parseFloat(inches);
		const totalInches = feetNum * 12 + inchesNum;
		return totalInches * 2.54; // Convert inches to cm
	};

	const calculateGoals = async () => {
		if (!user?.id) return;

		// Validate required fields
		if (
			!formData.month ||
			!formData.day ||
			!formData.year ||
			!formData.weight ||
			!formData.targetWeight ||
			!formData.heightFeet ||
			!formData.heightInches ||
			!formData.gender ||
			!formData.activityLevel ||
			!formData.fitnessGoal
		) {
			setError('Please fill in all fields');
			return;
		}

		// Validate DOB
		if (!validateDOB(formData.month, formData.day, formData.year)) {
			setError('Please enter a valid date of birth');
			return;
		}

		// Validate weight
		const weightLbs = parseFloat(formData.weight);
		if (isNaN(weightLbs) || weightLbs < 50 || weightLbs > 500) {
			setError('Please enter a valid weight between 50-500 lbs');
			return;
		}

		// Validate target weight
		const targetWeightLbs = parseFloat(formData.targetWeight);
		if (isNaN(targetWeightLbs) || targetWeightLbs < 50 || targetWeightLbs > 500) {
			setError('Please enter a valid target weight between 50-500 lbs');
			return;
		}

		// Validate height
		const feet = parseFloat(formData.heightFeet);
		const inches = parseFloat(formData.heightInches);
		if (isNaN(feet) || isNaN(inches) || feet < 3 || feet > 8 || inches < 0 || inches > 11) {
			setError('Please enter a valid height');
			return;
		}

		const age = calculateAge(formData.month, formData.day, formData.year);
		const weightKg = convertWeightToKg(formData.weight);
		const targetWeightKg = convertWeightToKg(formData.targetWeight);
		const heightCm = convertHeightToCm(formData.heightFeet, formData.heightInches);
		const dob = formatDOB(formData.month, formData.day, formData.year);

		setIsCalculating(true);
		setError('');

		try {
			const response = await fetchAPI('/(api)/nutrition-goals', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.id,
					dob: dob,
					age: age,
					weight: weightKg,
					targetWeight: targetWeightKg,
					height: heightCm,
					gender: formData.gender,
					activityLevel: formData.activityLevel,
					fitnessGoal: formData.fitnessGoal,
				}),
			});

			if (response.success) {
				setCalculatedGoals({
					daily_calories: response.data.daily_calories,
					daily_protein: response.data.daily_protein,
					daily_carbs: response.data.daily_carbs,
					daily_fats: response.data.daily_fats,
					bmr: response.calculations.bmr,
					tdee: response.calculations.tdee,
				});
				setCurrentStep(4); // Show goals preview
			} else {
				setError(response.error || 'Failed to calculate goals');
			}
		} catch (error) {
			console.error('Calculate goals error:', error);
			if (error instanceof Error) {
				setError(`Failed to calculate goals: ${error.message}`);
			} else {
				setError('Failed to calculate goals. Please try again.');
			}
		} finally {
			setIsCalculating(false);
		}
	};

	const saveGoals = async () => {
		if (!calculatedGoals) return;

		setIsSaving(true);
		try {
			// Goals are already saved during calculation, just close modal
			onGoalsSet();
			onClose();
		} catch (error) {
			setError('Failed to save goals. Please try again.');
			console.error('Save goals error:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const renderStep1 = () => (
		<View className="mb-6">
			<Text className="text-xl font-JakartaSemiBold mb-4 text-center">Personal Information</Text>

			{/* Date of Birth */}
			<View className="mb-4">
				<Text className="text-xs text-black font-JakartaSemiBold mb-2">Date of Birth</Text>
				<View className="flex flex-row gap-2">
					<View className="flex-1">
						<InputField
							placeholder={existingGoals ? formData.month || 'MM' : 'MM'}
							keyboardType="numeric"
							value={formData.month}
							onChangeText={value => {
								const num = parseInt(value);
								if (value === '' || (num >= 1 && num <= 12)) {
									updateFormData('month', value);
								}
							}}
							maxLength={2}
						/>
					</View>
					<View className="flex-1">
						<InputField
							placeholder={existingGoals ? formData.day || 'DD' : 'DD'}
							keyboardType="numeric"
							value={formData.day}
							onChangeText={value => {
								const num = parseInt(value);
								if (value === '' || (num >= 1 && num <= 31)) {
									updateFormData('day', value);
								}
							}}
							maxLength={2}
						/>
					</View>
					<View className="flex-1">
						<InputField
							placeholder={existingGoals ? formData.year || 'YYYY' : 'YYYY'}
							keyboardType="numeric"
							value={formData.year}
							onChangeText={value => {
								// Allow any numeric input while typing, validation will happen later
								if (value === '' || /^\d{0,4}$/.test(value)) {
									updateFormData('year', value);
								}
							}}
							maxLength={4}
						/>
					</View>
				</View>
			</View>

			{/* Weight */}
			<View className="mb-4">
				<Text className="text-xs text-black font-JakartaSemiBold mb-2">Weight (lbs)</Text>
				<InputField
					placeholder={
						existingGoals
							? formData.weight || 'Enter your weight in pounds'
							: 'Enter your weight in pounds'
					}
					keyboardType="numeric"
					value={formData.weight}
					onChangeText={value => updateFormData('weight', value)}
				/>
			</View>

			{/* Target Weight */}
			<View className="mb-4">
				<Text className="text-xs text-black font-JakartaSemiBold mb-2">Target Weight (lbs)</Text>
				<InputField
					placeholder={
						existingGoals
							? formData.targetWeight || 'Enter your target weight in pounds'
							: 'Enter your target weight in pounds'
					}
					keyboardType="numeric"
					value={formData.targetWeight}
					onChangeText={value => updateFormData('targetWeight', value)}
				/>
			</View>

			{/* Height */}
			<View className="mb-4">
				<Text className="text-xs text-black font-JakartaSemiBold mb-2">Height</Text>
				<View className="flex flex-row gap-2">
					<View className="flex-1">
						<InputField
							placeholder={existingGoals ? formData.heightFeet || '5 ft' : '5 ft'}
							keyboardType="numeric"
							value={formData.heightFeet}
							onChangeText={value => {
								const num = parseInt(value);
								if (value === '' || (num >= 3 && num <= 8)) {
									updateFormData('heightFeet', value);
								}
							}}
							maxLength={1}
						/>
					</View>
					<View className="flex-1">
						<InputField
							placeholder={existingGoals ? formData.heightInches || '10 in' : '10 in'}
							keyboardType="numeric"
							value={formData.heightInches}
							onChangeText={value => {
								const num = parseInt(value);
								if (value === '' || (num >= 0 && num <= 11)) {
									updateFormData('heightInches', value);
								}
							}}
							maxLength={2}
						/>
					</View>
				</View>
			</View>

			{/* Gender */}
			<View className="mb-6">
				<Text className="text-xs text-black font-JakartaSemiBold mb-2">Gender</Text>
				<View className="flex flex-row gap-2">
					{['male', 'female', 'other'].map(gender => (
						<TouchableOpacity
							key={gender}
							onPress={() => updateFormData('gender', gender)}
							className={`px-4 py-2 rounded-full border ${
								formData.gender === gender
									? 'bg-[#E3BBA1] border-[#E3BBA1]'
									: 'bg-white border-gray-300'
							}`}
						>
							<Text
								className={`text-sm capitalize ${
									formData.gender === gender ? 'text-white' : 'text-gray-600'
								}`}
							>
								{gender}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<CustomButton onPress={() => setCurrentStep(2)} title="Next" />
		</View>
	);

	const renderStep2 = () => (
		<View className="mb-6">
			<Text className="text-xl font-JakartaSemiBold mb-4 text-center">Activity Level</Text>

			<View className="space-y-3">
				{activityLevels.map(level => (
					<TouchableOpacity
						key={level.key}
						onPress={() => updateFormData('activityLevel', level.key)}
						className={`p-4 rounded-lg border ${
							formData.activityLevel === level.key
								? 'bg-[#E3BBA1] border-[#E3BBA1]'
								: 'bg-white border-gray-300'
						}`}
					>
						<View className="flex flex-row items-center">
							<Text className="text-2xl mr-3">{level.icon}</Text>
							<View className="flex-1">
								<Text
									className={`font-JakartaSemiBold ${
										formData.activityLevel === level.key ? 'text-white' : 'text-black'
									}`}
								>
									{level.title}
								</Text>
								<Text
									className={`text-sm ${
										formData.activityLevel === level.key ? 'text-white' : 'text-gray-600'
									}`}
								>
									{level.description}
								</Text>
							</View>
						</View>
					</TouchableOpacity>
				))}
			</View>

			<View className="flex flex-row gap-2 mt-6">
				<CustomButton onPress={() => setCurrentStep(1)} title="Back" />
				<CustomButton onPress={() => setCurrentStep(3)} title="Next" />
			</View>
		</View>
	);

	const renderStep3 = () => (
		<View className="mb-6">
			<Text className="text-xl font-JakartaSemiBold mb-4 text-center">Fitness Goal</Text>

			<View className="space-y-3">
				{fitnessGoals.map(goal => (
					<TouchableOpacity
						key={goal.key}
						onPress={() => updateFormData('fitnessGoal', goal.key)}
						className={`p-4 rounded-lg border ${
							formData.fitnessGoal === goal.key
								? 'bg-[#E3BBA1] border-[#E3BBA1]'
								: 'bg-white border-gray-300'
						}`}
					>
						<View className="flex flex-row items-center">
							<Text className="text-2xl mr-3">{goal.icon}</Text>
							<View className="flex-1">
								<Text
									className={`font-JakartaSemiBold ${
										formData.fitnessGoal === goal.key ? 'text-white' : 'text-black'
									}`}
								>
									{goal.title}
								</Text>
								<Text
									className={`text-sm ${
										formData.fitnessGoal === goal.key ? 'text-white' : 'text-gray-600'
									}`}
								>
									{goal.description}
								</Text>
							</View>
						</View>
					</TouchableOpacity>
				))}
			</View>

			<View className="flex flex-row gap-2 mt-6">
				<CustomButton onPress={() => setCurrentStep(2)} title="Back" />
				<CustomButton onPress={calculateGoals} title="Calculate Goals" />
			</View>
		</View>
	);

	const renderStep4 = () => {
		const age =
			formData.month && formData.day && formData.year
				? calculateAge(formData.month, formData.day, formData.year)
				: 0;
		const weightKg = formData.weight ? convertWeightToKg(formData.weight) : 0;
		const targetWeightKg = formData.targetWeight ? convertWeightToKg(formData.targetWeight) : 0;
		const heightCm =
			formData.heightFeet && formData.heightInches
				? convertHeightToCm(formData.heightFeet, formData.heightInches)
				: 0;

		return (
			<View className="mb-6">
				<Text className="text-xl font-JakartaSemiBold mb-4 text-center">Your Nutrition Goals</Text>

				{/* Personal Info Summary */}
				<View className="bg-blue-50 p-4 rounded-lg mb-4">
					<Text className="text-center text-sm text-blue-700 mb-2">Calculated for:</Text>
					<Text className="text-center text-sm text-blue-700">Age: {age} years old</Text>
					<Text className="text-center text-sm text-blue-700">
						Weight: {formData.weight} lbs ({weightKg.toFixed(1)} kg)
					</Text>
					<Text className="text-center text-sm text-blue-700">
						Target Weight: {formData.targetWeight} lbs ({targetWeightKg.toFixed(1)} kg)
					</Text>
					<Text className="text-center text-sm text-blue-700">
						Height: {formData.heightFeet}'{formData.heightInches}" ({heightCm.toFixed(1)} cm)
					</Text>
				</View>

				{calculatedGoals && (
					<View className="bg-gray-50 p-4 rounded-lg mb-6">
						<View className="mb-4">
							<Text className="text-lg font-JakartaSemiBold mb-2">Daily Targets</Text>
							<View className="flex flex-row justify-between mb-2">
								<Text className="font-JakartaSemiBold">Calories:</Text>
								<Text className="text-lg">{calculatedGoals.daily_calories} kcal</Text>
							</View>
							<View className="flex flex-row justify-between mb-2">
								<Text className="font-JakartaSemiBold">Protein:</Text>
								<Text>{calculatedGoals.daily_protein}g</Text>
							</View>
							<View className="flex flex-row justify-between mb-2">
								<Text className="font-JakartaSemiBold">Carbs:</Text>
								<Text>{calculatedGoals.daily_carbs}g</Text>
							</View>
							<View className="flex flex-row justify-between mb-2">
								<Text className="font-JakartaSemiBold">Fats:</Text>
								<Text>{calculatedGoals.daily_fats}g</Text>
							</View>
						</View>

						<View className="border-t pt-4">
							<Text className="text-sm text-gray-600 mb-2">Calculations:</Text>
							<Text className="text-sm text-gray-600">BMR: {calculatedGoals.bmr} kcal</Text>
							<Text className="text-sm text-gray-600">TDEE: {calculatedGoals.tdee} kcal</Text>
						</View>
					</View>
				)}

				<View className="flex flex-row gap-2">
					<CustomButton onPress={() => setCurrentStep(3)} title="Back" />
					<CustomButton onPress={saveGoals} title="Save Goals" />
				</View>
			</View>
		);
	};

	const renderCurrentStep = () => {
		switch (currentStep) {
			case 1:
				return renderStep1();
			case 2:
				return renderStep2();
			case 3:
				return renderStep3();
			case 4:
				return renderStep4();
			default:
				return renderStep1();
		}
	};

	return (
		<ReactNativeModal isVisible={isVisible} onBackdropPress={onClose}>
			<ScrollView className="bg-white py-6 px-4 rounded-md max-h-[90%]">
				<View className="flex flex-row justify-between items-center mb-6">
					<Text className="text-xl font-JakartaSemiBold">Set Your Goals</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={24} color="black" />
					</TouchableOpacity>
				</View>

				{/* Progress Indicator */}
				<View className="flex flex-row justify-center mb-6">
					{[1, 2, 3, 4].map(step => (
						<View key={step} className="flex flex-row items-center">
							<View
								className={`w-8 h-8 rounded-full flex items-center justify-center ${
									step <= currentStep ? 'bg-[#E3BBA1]' : 'bg-gray-300'
								}`}
							>
								<Text
									className={`text-sm font-JakartaSemiBold ${
										step <= currentStep ? 'text-white' : 'text-gray-600'
									}`}
								>
									{step}
								</Text>
							</View>
							{step < 4 && (
								<View
									className={`w-8 h-1 mx-1 ${step < currentStep ? 'bg-[#E3BBA1]' : 'bg-gray-300'}`}
								/>
							)}
						</View>
					))}
				</View>

				{error ? <Text className="text-red-500 text-center mb-4">{error}</Text> : null}

				{isCalculating && (
					<View className="flex justify-center items-center mb-6">
						<ActivityIndicator size="large" color="#E3BBA1" />
						<Text className="text-center mt-2 text-sm text-gray-600">
							Calculating your personalized goals...
						</Text>
					</View>
				)}

				{renderCurrentStep()}
			</ScrollView>
		</ReactNativeModal>
	);
};

export default GoalSetupModal;
