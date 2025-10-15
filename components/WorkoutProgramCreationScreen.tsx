import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';

interface ProgramData {
	goal: string;
	frequency: number;
	workoutDays: string[];
	duration: number;
	programWeeks: number;
	equipment: string[];
}

const GOALS = [
	'Build Muscle',
	'Lose Weight',
	'Get Stronger',
	'Improve Endurance',
	'General Fitness',
	'Athletic Performance',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EQUIPMENT_OPTIONS = [
	'Bodyweight Only',
	'Dumbbells',
	'Barbell',
	'Resistance Bands',
	'Kettlebell',
	'Pull-up Bar',
	'Bench',
	'Cardio Machine',
	'Gym Access',
];

export default function WorkoutProgramCreationScreen() {
	const router = useRouter();
	const { user } = useUser();
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [programData, setProgramData] = useState<ProgramData>({
		goal: '',
		frequency: 3,
		workoutDays: [],
		duration: 45,
		programWeeks: 8,
		equipment: [],
	});

	const updateProgramData = (field: keyof ProgramData, value: any) => {
		setProgramData(prev => ({ ...prev, [field]: value }));
	};

	const nextStep = () => {
		if (currentStep < 6) {
			setCurrentStep(currentStep + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const createProgram = async () => {
		if (!user) {
			Alert.alert('Error', 'User not authenticated');
			return;
		}

		setLoading(true);
		try {
			const result = await fetchAPI('/api/ai-workout-generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					...programData,
				}),
			});

			if (result.success) {
				Alert.alert('Success!', `Your "${result.data.programName}" program has been created!`, [
					{
						text: 'View Program',
						onPress: () => router.push(`/workout-program/${result.data.programId}`),
					},
				]);
			} else {
				Alert.alert('Error', result.error || 'Failed to create program');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to create workout program');
		} finally {
			setLoading(false);
		}
	};

	const renderStep1 = () => (
		<View className="flex-1 p-6">
			<Text className="text-2xl font-JakartaBold mb-2">What's your main goal?</Text>
			<Text className="text-gray-600 mb-8">This will shape your entire program</Text>

			<View className="space-y-3">
				{GOALS.map(goal => (
					<TouchableOpacity
						key={goal}
						onPress={() => updateProgramData('goal', goal)}
						className={`p-4 rounded-xl border-2 ${
							programData.goal === goal ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
						}`}
					>
						<Text
							className={`font-JakartaSemiBold ${
								programData.goal === goal ? 'text-blue-600' : 'text-gray-800'
							}`}
						>
							{goal}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	const renderStep2 = () => (
		<View className="flex-1 p-6">
			<Text className="text-2xl font-JakartaBold mb-2">How often do you want to workout?</Text>
			<Text className="text-gray-600 mb-8">Choose your weekly frequency</Text>

			<View className="space-y-3">
				{[2, 3, 4, 5, 6].map(freq => (
					<TouchableOpacity
						key={freq}
						onPress={() => updateProgramData('frequency', freq)}
						className={`p-4 rounded-xl border-2 ${
							programData.frequency === freq
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200 bg-white'
						}`}
					>
						<Text
							className={`font-JakartaSemiBold ${
								programData.frequency === freq ? 'text-blue-600' : 'text-gray-800'
							}`}
						>
							{freq} times per week
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	const renderStep3 = () => {
		const isDaySelected = (day: string) => programData.workoutDays.includes(day);
		const isMaxDaysSelected = programData.workoutDays.length >= programData.frequency;

		return (
			<View className="flex-1 p-6">
				<Text className="text-2xl font-JakartaBold mb-2">Which days?</Text>
				<Text className="text-gray-600 mb-2">
					Select {programData.frequency} workout day{programData.frequency > 1 ? 's' : ''}
				</Text>
				<Text className="text-sm text-gray-500 mb-8">
					{programData.workoutDays.length} of {programData.frequency} selected
				</Text>

				<View className="flex-row flex-wrap gap-3">
					{DAYS.map(day => {
						const isSelected = isDaySelected(day);
						const isDisabled = !isSelected && isMaxDaysSelected;

						return (
							<TouchableOpacity
								key={day}
								onPress={() => {
									if (isDisabled) return;

									const newDays = isSelected
										? programData.workoutDays.filter(d => d !== day)
										: [...programData.workoutDays, day];
									updateProgramData('workoutDays', newDays);
								}}
								disabled={isDisabled}
								className={`px-4 py-3 rounded-xl border-2 ${
									isSelected
										? 'border-blue-500 bg-blue-50'
										: isDisabled
											? 'border-gray-100 bg-gray-50'
											: 'border-gray-200 bg-white'
								}`}
							>
								<Text
									className={`font-JakartaSemiBold ${
										isSelected ? 'text-blue-600' : isDisabled ? 'text-gray-400' : 'text-gray-800'
									}`}
								>
									{day}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>
		);
	};

	const renderStep4 = () => (
		<View className="flex-1 p-6">
			<Text className="text-2xl font-JakartaBold mb-2">Session duration</Text>
			<Text className="text-gray-600 mb-8">How long per workout?</Text>

			<View className="space-y-3">
				{[30, 45, 60, 75, 90].map(duration => (
					<TouchableOpacity
						key={duration}
						onPress={() => updateProgramData('duration', duration)}
						className={`p-4 rounded-xl border-2 ${
							programData.duration === duration
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200 bg-white'
						}`}
					>
						<Text
							className={`font-JakartaSemiBold ${
								programData.duration === duration ? 'text-blue-600' : 'text-gray-800'
							}`}
						>
							{duration} minutes
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	const renderStep5 = () => (
		<View className="flex-1 p-6">
			<Text className="text-2xl font-JakartaBold mb-2">Program length</Text>
			<Text className="text-gray-600 mb-8">How many weeks?</Text>

			<View className="space-y-3">
				{[4, 6, 8, 12, 16].map(weeks => (
					<TouchableOpacity
						key={weeks}
						onPress={() => updateProgramData('programWeeks', weeks)}
						className={`p-4 rounded-xl border-2 ${
							programData.programWeeks === weeks
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200 bg-white'
						}`}
					>
						<Text
							className={`font-JakartaSemiBold ${
								programData.programWeeks === weeks ? 'text-blue-600' : 'text-gray-800'
							}`}
						>
							{weeks} weeks
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	const renderStep6 = () => (
		<View className="flex-1 p-6">
			<Text className="text-2xl font-JakartaBold mb-2">Available equipment</Text>
			<Text className="text-gray-600 mb-8">Select what you have access to</Text>

			<View className="flex-row flex-wrap gap-3">
				{EQUIPMENT_OPTIONS.map(equipment => (
					<TouchableOpacity
						key={equipment}
						onPress={() => {
							const newEquipment = programData.equipment.includes(equipment)
								? programData.equipment.filter(e => e !== equipment)
								: [...programData.equipment, equipment];
							updateProgramData('equipment', newEquipment);
						}}
						className={`px-4 py-3 rounded-xl border-2 ${
							programData.equipment.includes(equipment)
								? 'border-blue-500 bg-blue-50'
								: 'border-gray-200 bg-white'
						}`}
					>
						<Text
							className={`font-JakartaSemiBold ${
								programData.equipment.includes(equipment) ? 'text-blue-600' : 'text-gray-800'
							}`}
						>
							{equipment}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	const canProceed = () => {
		switch (currentStep) {
			case 1:
				return programData.goal !== '';
			case 2:
				return programData.frequency > 0;
			case 3:
				return programData.workoutDays.length === programData.frequency;
			case 4:
				return programData.duration > 0;
			case 5:
				return programData.programWeeks > 0;
			case 6:
				return programData.equipment.length > 0;
			default:
				return false;
		}
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
			case 5:
				return renderStep5();
			case 6:
				return renderStep6();
			default:
				return renderStep1();
		}
	};

	return (
		<View className="flex-1 bg-white">
			{/* Header */}
			<View className="flex-row items-center justify-between p-6 border-b border-gray-200">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={24} color="#374151" />
				</TouchableOpacity>
				<Text className="text-lg font-JakartaSemiBold">Create Program</Text>
				<View className="w-6" />
			</View>

			{/* Progress Bar */}
			<View className="px-6 py-4">
				<View className="flex-row items-center">
					{[1, 2, 3, 4, 5, 6].map(step => (
						<View key={step} className="flex-row items-center">
							<View
								className={`w-8 h-8 rounded-full items-center justify-center ${
									step <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
								}`}
							>
								<Text
									className={`font-JakartaSemiBold ${
										step <= currentStep ? 'text-white' : 'text-gray-500'
									}`}
								>
									{step}
								</Text>
							</View>
							{step < 6 && (
								<View className={`w-8 h-1 ${step < currentStep ? 'bg-blue-500' : 'bg-gray-200'}`} />
							)}
						</View>
					))}
				</View>
			</View>

			{/* Content */}
			<ScrollView className="flex-1">{renderCurrentStep()}</ScrollView>

			{/* Footer */}
			<View className="p-6 border-t border-gray-200">
				<View className="flex-row justify-between">
					<TouchableOpacity
						onPress={prevStep}
						disabled={currentStep === 1}
						className={`px-6 py-3 rounded-xl ${currentStep === 1 ? 'bg-gray-100' : 'bg-gray-200'}`}
					>
						<Text
							className={`font-JakartaSemiBold ${
								currentStep === 1 ? 'text-gray-400' : 'text-gray-700'
							}`}
						>
							Previous
						</Text>
					</TouchableOpacity>

					{currentStep < 6 ? (
						<TouchableOpacity
							onPress={nextStep}
							disabled={!canProceed()}
							className={`px-6 py-3 rounded-xl ${canProceed() ? 'bg-blue-500' : 'bg-gray-300'}`}
						>
							<Text
								className={`font-JakartaSemiBold ${canProceed() ? 'text-white' : 'text-gray-500'}`}
							>
								Next
							</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							onPress={createProgram}
							disabled={!canProceed() || loading}
							className={`px-6 py-3 rounded-xl ${
								canProceed() && !loading ? 'bg-green-500' : 'bg-gray-300'
							}`}
						>
							<Text
								className={`font-JakartaSemiBold ${
									canProceed() && !loading ? 'text-white' : 'text-gray-500'
								}`}
							>
								{loading ? 'Creating...' : 'Create Program'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</View>
	);
}
