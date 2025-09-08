import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Alert,
	Linking,
	ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReactNativeModal from 'react-native-modal';
import CustomButton from './CustomButton';
import { fetchAPI } from '@/lib/fetch';

interface DataConsentModalProps {
	isVisible: boolean;
	onClose: () => void;
	onConsent: () => void;
	clerkId: string;
}

const DataConsentModal: React.FC<DataConsentModalProps> = ({
	isVisible,
	onClose,
	onConsent,
	clerkId,
}) => {
	const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
	const [dataCollectionAccepted, setDataCollectionAccepted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const dataCollectionItems = [
		{
			title: 'Basic Profile Information',
			description: 'Name, email, and account information for app functionality',
		},
		{
			title: 'Health Metrics',
			description:
				'Weight, height, age, gender, and fitness goals for personalized recommendations',
		},
		{
			title: 'Nutrition & Meal Data',
			description: 'Food intake, calories, macronutrients, and meal tracking information',
		},
		{
			title: 'Weight Tracking',
			description: 'Weight measurements over time for progress tracking',
		},
		{
			title: 'Step & Activity Data (HealthKit)',
			description:
				'Daily step count and physical activity data from Apple HealthKit for fitness tracking and calorie calculations',
		},
		{
			title: 'Workout Activities',
			description: 'Manual workout logging and estimated calorie burn',
		},
	];

	const handlePrivacyPolicyLink = () => {
		Linking.openURL('https://fortia.app/privacy-policy.html');
	};

	const handleClose = () => {
		if (!privacyPolicyAccepted || !dataCollectionAccepted) {
			Alert.alert(
				'Consent Required',
				'You must accept both the Privacy Policy and Data Collection consent to continue.',
				[{ text: 'OK' }]
			);
			return;
		}
		onClose();
	};

	const handleSubmit = async () => {
		if (!privacyPolicyAccepted) {
			Alert.alert('Privacy Policy Required', 'Please accept the Privacy Policy to continue.', [
				{ text: 'OK' },
			]);
			return;
		}
		if (!dataCollectionAccepted) {
			Alert.alert(
				'Data Collection Consent Required',
				'Please accept the Data Collection consent to continue.',
				[{ text: 'OK' }]
			);
			return;
		}

		setIsSubmitting(true);
		try {
			// Store data collection consent
			await fetchAPI('/api/data-consent', {
				method: 'POST',
				body: JSON.stringify({
					clerkId,
					basicProfile: true,
					healthMetrics: true,
					nutritionData: true,
					weightTracking: true,
					stepTracking: true,
					workoutActivities: true,
					consentVersion: '1.0',
					consentMethod: 'onboarding',
				}),
			});

			// Store privacy consent
			await fetchAPI('/api/privacy-consent', {
				method: 'POST',
				body: JSON.stringify({
					clerkId,
					consentVersion: '1.0',
					consentMethod: 'onboarding',
				}),
			});

			onConsent();
			onClose();
		} catch (error) {
			Alert.alert('Error', 'Failed to save your consent. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const allConsentsAccepted = privacyPolicyAccepted && dataCollectionAccepted;

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={handleClose}
			onBackButtonPress={handleClose}
			className="m-0"
			animationIn="slideInUp"
			animationOut="slideOutDown"
		>
			<View className="flex-1 bg-white mt-20 rounded-t-3xl">
				<ScrollView className="flex-1 px-6">
					{/* Header */}
					<View className="py-6 border-b border-gray-200">
						<View className="flex-row justify-between items-center mb-4">
							<Text className="text-2xl font-JakartaBold text-gray-900">
								Data Collection & Privacy Policy Consent
							</Text>
							<TouchableOpacity onPress={handleClose}>
								<Ionicons name="close" size={24} color="#6B7280" />
							</TouchableOpacity>
						</View>
						<Text className="text-gray-600 leading-6">
							Fortia requires access to your data to provide personalized fitness and nutrition
							services. Please review and accept the data collection categories and privacy policy
							below.
						</Text>
					</View>

					{/* Data Collection Information */}
					<View className="py-6">
						<Text className="text-lg font-JakartaSemiBold text-gray-900 mb-4">
							Data Collection Categories
						</Text>
						<Text className="text-gray-600 text-sm mb-4">
							The following data is required to provide you with personalized fitness and nutrition
							services:
						</Text>

						{dataCollectionItems.map((item, index) => (
							<View key={index} className="mb-4">
								<View className="flex-row items-start space-x-3">
									<View className="flex-1">
										<Text className="text-base font-JakartaSemiBold text-gray-900 mb-1">
											{item.title}
										</Text>
										<Text className="text-gray-600 leading-5">{item.description}</Text>
									</View>
								</View>
							</View>
						))}
					</View>

					{/* Privacy Policy Consent */}
					<View className="py-6 border-y border-gray-200">
						<View className="flex-row items-start space-x-3">
							<TouchableOpacity
								onPress={() => setPrivacyPolicyAccepted(!privacyPolicyAccepted)}
								className="mt-1"
							>
								<View
									className={`w-5 h-5 rounded border-2 items-center justify-center ${
										privacyPolicyAccepted ? 'bg-[#E3BBA1] border-[#E3BBA1]' : 'border-gray-400'
									}`}
								>
									{privacyPolicyAccepted && <Ionicons name="checkmark" size={14} color="white" />}
								</View>
							</TouchableOpacity>
							<View className="flex-1">
								<Text className="text-gray-900 text-base leading-6">
									I have read and agree to the{' '}
									<Text
										className="text-[#E3BBA1] font-JakartaSemiBold"
										onPress={handlePrivacyPolicyLink}
									>
										Privacy Policy
									</Text>{' '}
									and consent to the collection and processing of my data for the purposes
									described.
								</Text>
							</View>
						</View>
					</View>

					{/* Data Collection Consent Checkbox */}
					<View className="py-6 border-b border-gray-200">
						<View className="flex-row items-start space-x-3">
							<TouchableOpacity
								onPress={() => setDataCollectionAccepted(!dataCollectionAccepted)}
								className="mt-1"
							>
								<View
									className={`w-5 h-5 rounded border-2 items-center justify-center ${
										dataCollectionAccepted ? 'bg-[#E3BBA1] border-[#E3BBA1]' : 'border-gray-400'
									}`}
								>
									{dataCollectionAccepted && <Ionicons name="checkmark" size={14} color="white" />}
								</View>
							</TouchableOpacity>
							<View className="flex-1">
								<Text className="text-gray-900 text-base leading-6">
									I consent to the collection and processing of my personal and health data as
									described above for the purpose of providing personalized fitness and nutrition
									services.
								</Text>
							</View>
						</View>
					</View>

					{/* Warning Message */}
					{!allConsentsAccepted && (
						<View className="my-4 p-4 bg-red-50 rounded-lg border border-red-200">
							<View className="flex-row items-start">
								<Ionicons name="warning" size={20} color="#EF4444" className="mt-0.5" />
								<View className="ml-3 flex-1">
									<Text className="text-red-900 font-JakartaSemiBold mb-1">Consent Required</Text>
									<Text className="text-red-800 text-sm leading-5">
										You must accept both the Privacy Policy and Data Collection consent to continue.
										All data collection categories are required for app functionality.
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Information Box */}
					<View className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
						<View className="flex-row items-start">
							<Ionicons name="information-circle" size={20} color="#3B82F6" className="mt-0.5" />
							<View className="ml-3 flex-1">
								<Text className="text-blue-900 font-JakartaSemiBold mb-1">
									Why We Need This Data
								</Text>
								<Text className="text-blue-800 text-sm leading-5">
									Fortia uses this information to calculate your personalized nutrition goals, track
									your progress, and provide accurate fitness recommendations. All data is stored
									securely and used only for these purposes.
								</Text>
							</View>
						</View>
					</View>
				</ScrollView>

				{/* Footer */}
				<View className="px-6 py-4 border-t border-gray-200">
					<CustomButton
						title={isSubmitting ? 'Saving...' : 'Accept All & Continue'}
						onPress={handleSubmit}
						className="mb-3"
						bgVariant={allConsentsAccepted ? 'success' : 'secondary'}
						disabled={!allConsentsAccepted || isSubmitting}
					/>
					{isSubmitting && (
						<View className="absolute right-10 top-6">
							<ActivityIndicator size="small" color="#22c55e" />
						</View>
					)}
				</View>
			</View>
		</ReactNativeModal>
	);
};

export default DataConsentModal;
