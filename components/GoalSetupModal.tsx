import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import CustomButton from './CustomButton';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import InputField from './InputField';
import { fetchAPI } from '@/lib/fetch';
import { useUser } from '@clerk/clerk-expo';
import { useGoalsStore } from '@/store';

interface GoalSetupModalProps {
	isVisible: boolean;
	onClose: () => void;
	onGoalsSet: () => void;
}

interface FormData {
	targetWeight: string;
	fitnessGoal: string;
}

interface ExistingNutritionGoals {
	id: string;
	userId: string;
	targetWeight: number;
	fitnessGoal: string;
	createdAt: string;
	updatedAt: string;
}

const GoalSetupModal: React.FC<GoalSetupModalProps> = ({ isVisible, onClose, onGoalsSet }) => {
	const [formData, setFormData] = useState<FormData>({
		targetWeight: '',
		fitnessGoal: '',
	});
	const [existingGoals, setExistingGoals] = useState<ExistingNutritionGoals | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const { user } = useUser();
	const { triggerGoalsUpdate } = useGoalsStore();

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
		// Target weight is already in lbs, just convert to string
		const targetWeightLbs = goals.targetWeight ? Math.round(goals.targetWeight).toString() : '';

		setFormData({
			targetWeight: targetWeightLbs,
			fitnessGoal: goals.fitnessGoal,
		});
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

	const updateFormData = (field: keyof FormData, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const convertWeightToLbs = (weightLbs: string): number => {
		return parseFloat(weightLbs);
	};

	const saveGoals = async () => {
		if (!user?.id) return;

		// Validate required fields
		if (!formData.targetWeight || !formData.fitnessGoal) {
			setError('Please fill in all fields');
			return;
		}

		setIsSaving(true);
		setError('');

		try {
			const targetWeightLbs = convertWeightToLbs(formData.targetWeight);

			// We need to get the existing user data to preserve other fields
			const existingResponse = await fetchAPI(`/(api)/nutrition-goals?userId=${user.id}`, {
				method: 'GET',
			});

			if (!existingResponse.success || !existingResponse.data) {
				setError('Failed to fetch existing user data');
				return;
			}

			const existingData = existingResponse.data;

			const response = await fetchAPI('/(api)/nutrition-goals', {
				method: 'POST',
				body: JSON.stringify({
					userId: user.id,
					dob: existingData.dob,
					weight: existingData.weight,
					targetWeight: targetWeightLbs,
					height: existingData.height,
					gender: existingData.gender,
					activityLevel: existingData.activity_level,
					fitnessGoal: formData.fitnessGoal,
				}),
			});

			if (response.success) {
				triggerGoalsUpdate(); // Trigger global goals update
				onGoalsSet();
				onClose();
			} else {
				setError(response.error || 'Failed to save goals');
			}
		} catch (error) {
			console.error('Save goals error:', error);
			setError('Failed to save goals. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<ReactNativeModal isVisible={isVisible} onBackdropPress={onClose}>
			<ScrollView className="bg-white py-6 px-4 rounded-md max-h-[90%]">
				<View className="flex flex-row justify-between items-center mb-6">
					<Text className="text-xl font-JakartaSemiBold">Update Your Goals</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={24} color="black" />
					</TouchableOpacity>
				</View>

				{error ? <Text className="text-red-500 text-center mb-4">{error}</Text> : null}

				{/* Target Weight */}
				<View className="mb-6">
					<Text className="text-lg font-JakartaSemiBold mb-4 text-center">Target Weight</Text>
					<View className="mb-4">
						<Text className="text-xs text-black font-JakartaSemiBold mb-2">
							Target Weight (lbs)
						</Text>
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
				</View>

				{/* Fitness Goal */}
				<View className="mb-6">
					<Text className="text-lg font-JakartaSemiBold mb-4 text-center">Fitness Goal</Text>
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
				</View>

				{/* Save Button */}
				<CustomButton
					onPress={isSaving ? () => {} : saveGoals}
					title={isSaving ? 'Saving...' : 'Save Goals'}
				/>
			</ScrollView>
		</ReactNativeModal>
	);
};

export default GoalSetupModal;
