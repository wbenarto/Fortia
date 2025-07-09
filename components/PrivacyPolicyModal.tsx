import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyPolicyModalProps {
	isVisible: boolean;
	onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isVisible, onClose }) => {
	const handleOpenWebsite = async () => {
		const url = 'https://fortia.app/privacy-policy.html';
		try {
			const supported = await Linking.canOpenURL(url);
			if (supported) {
				await Linking.openURL(url);
			} else {
				Alert.alert('Error', 'Cannot open privacy policy website');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to open privacy policy website');
		}
	};

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			className="m-0"
		>
			<View className="bg-white rounded-t-3xl flex-1 mt-20">
				{/* Header */}
				<View className="flex-row items-center justify-between p-6 border-b border-gray-200">
					<Text className="text-xl font-JakartaSemiBold text-gray-800">Privacy Policy</Text>
					<TouchableOpacity onPress={onClose} className="p-2">
						<Ionicons name="close" size={24} color="#64748B" />
					</TouchableOpacity>
				</View>

				{/* Content */}
				<View className="flex-1 p-6">
					<View className="flex items-center justify-center flex-1">
						<Ionicons name="shield-checkmark" size={64} color="#E3BBA1" />

						<Text className="text-xl font-JakartaSemiBold text-gray-800 text-center mt-6 mb-4">
							Your Privacy Matters
						</Text>

						<Text className="text-gray-600 text-center leading-6 mb-6">
							Fortia collects and processes your data to provide personalized fitness and nutrition
							tracking services. We are committed to protecting your privacy and being transparent
							about our data practices.
						</Text>

						<View className="bg-gray-50 rounded-xl p-4 mb-6 w-full">
							<Text className="text-gray-700 text-sm leading-5 mb-3">
								<Text className="font-JakartaSemiBold">What we collect:</Text>
							</Text>
							<View className="space-y-2">
								<Text className="text-gray-600 text-sm">
									• Personal information (name, email, DOB)
								</Text>
								<Text className="text-gray-600 text-sm">
									• Health data (weight, height, fitness goals)
								</Text>
								<Text className="text-gray-600 text-sm">
									• Activity data (steps, workouts, nutrition)
								</Text>
								<Text className="text-gray-600 text-sm">• HealthKit data (with your consent)</Text>
							</View>
						</View>

						<Text className="text-gray-600 text-center leading-6 mb-6">
							For the complete privacy policy with detailed information about data processing,
							retention, and your rights, please visit our website.
						</Text>

						<TouchableOpacity
							onPress={handleOpenWebsite}
							className="bg-[#E3BBA1] py-4 px-8 rounded-xl w-full"
						>
							<Text className="text-white text-center font-JakartaSemiBold text-lg">
								View Full Privacy Policy
							</Text>
						</TouchableOpacity>

						<Text className="text-gray-500 text-xs text-center mt-4">
							Last updated: {new Date().toLocaleDateString()}
						</Text>
					</View>
				</View>
			</View>
		</ReactNativeModal>
	);
};

export default PrivacyPolicyModal;
