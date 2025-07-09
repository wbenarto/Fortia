import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FAQItem {
	id: number;
	question: string;
	answer: string;
}

const HelpSupport = () => {
	const insets = useSafeAreaInsets();
	const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

	const faqData: FAQItem[] = [
		{
			id: 1,
			question: 'How do I set up my nutrition goals?',
			answer:
				'Go to your Profile tab and tap "Set Up Goals" or "Edit Profile". Enter your personal information including age, weight, height, gender, activity level, and fitness goals. The app will automatically calculate your BMR, TDEE, and daily macro targets.',
		},
		{
			id: 2,
			question: 'How accurate is the AI meal analysis?',
			answer:
				'Our AI provides nutritional estimates based on available data. While we strive for accuracy, these are approximations and should not replace professional medical advice. For best results, provide detailed descriptions of your meals including portion sizes.',
		},
		{
			id: 3,
			question: 'How do I track my steps and activities?',
			answer:
				'The app automatically syncs with your device\'s step counter and HealthKit (iOS). Make sure you\'ve granted the necessary permissions in your device settings. You can also manually log workouts using the "Log Activity" button.',
		},
		{
			id: 4,
			question: 'Can I use Fortia without a subscription?',
			answer:
				'Yes! Fortia offers a free tier with core features including meal tracking, weight logging, and basic progress visualization. Premium features like advanced analytics and meal planning require a subscription.',
		},
		{
			id: 5,
			question: 'How do I cancel my subscription?',
			answer:
				"You can cancel your subscription through your device's subscription settings (iOS App Store or Google Play Store). Cancellation will take effect at the end of your current billing period.",
		},
		{
			id: 6,
			question: 'Is my health data secure?',
			answer:
				'Yes, we take data security seriously. Your health data is encrypted and stored securely. We never share your personal information with third parties without your explicit consent. You can request data deletion at any time.',
		},
		{
			id: 7,
			question: 'How do I reset my nutrition goals?',
			answer:
				'Go to your Profile tab and tap "Reset Nutrition Goals". This will clear your current goals and allow you to set new ones. Your account information will be preserved.',
		},
		{
			id: 8,
			question: "The app isn't syncing with my fitness tracker",
			answer:
				"First, ensure you've granted the necessary permissions in your device settings. For iOS, check that HealthKit permissions are enabled. For Android, verify that the app has access to your fitness data. Try restarting the app if issues persist.",
		},
	];

	const toggleFAQ = (id: number) => {
		setExpandedFAQ(expandedFAQ === id ? null : id);
	};

	const openEmail = async () => {
		try {
			// Create a more detailed email with helpful context
			const subject = encodeURIComponent('Fortia Support Request');
			const body = encodeURIComponent(`Hi Fortia Support Team,

I need help with the Fortia app. Here are my details:

App Version: 1.0.0
Device: ${Platform.OS === 'ios' ? 'iOS' : 'Android'}
Issue Description: [Please describe your issue here]

Thank you for your help!

Best regards,
[Your name]`);

			const url = `mailto:support@fortia.app?subject=${subject}&body=${body}`;
			const supported = await Linking.canOpenURL(url);

			if (supported) {
				await Linking.openURL(url);
			} else {
				Alert.alert(
					'Error',
					'Cannot open email app. Please make sure you have an email app installed.'
				);
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to open email app. Please try again.');
		}
	};

	const openWebsite = async () => {
		try {
			const url = 'https://fortia.app/support';
			const supported = await Linking.canOpenURL(url);

			if (supported) {
				await Linking.openURL(url);
			} else {
				Alert.alert('Error', 'Cannot open support website');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to open support website');
		}
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1 bg-[#262135]" style={{ paddingTop: insets.top }}>
				{/* Header */}
				<View className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-700">
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons name="arrow-back" size={24} color="#E3BBA1" />
					</TouchableOpacity>
					<Text className="text-white text-lg font-JakartaSemiBold">Help & Support</Text>
					<View style={{ width: 24 }} />
				</View>

				<ScrollView className="flex-1 px-6 py-4">
					{/* Welcome Section */}
					<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
						<View className="flex items-center mb-4">
							<Ionicons name="help-circle" size={48} color="#E3BBA1" />
						</View>
						<Text className="text-white text-lg font-JakartaSemiBold text-center mb-2">
							How can we help you?
						</Text>
						<Text className="text-gray-400 text-sm text-center leading-6">
							Find answers to common questions, learn how to use Fortia effectively, and get in
							touch with our support team.
						</Text>
					</View>

					{/* Quick Actions */}
					<View className="mb-6">
						<Text className="text-white text-lg font-JakartaSemiBold mb-4">Quick Actions</Text>
						<View className="space-y-3">
							<TouchableOpacity
								onPress={openEmail}
								className="bg-[#2D2A3F] rounded-xl p-4 flex flex-row items-center"
							>
								<Ionicons name="mail-outline" size={24} color="#E3BBA1" />
								<View className="ml-4 flex-1">
									<Text className="text-white font-JakartaSemiBold">Contact Support</Text>
									<Text className="text-gray-400 text-sm">Send us an email</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="gray" />
							</TouchableOpacity>

							{/* <TouchableOpacity
								onPress={openWebsite}
								className="bg-[#2D2A3F] rounded-xl p-4 flex flex-row items-center"
							>
								<Ionicons name="globe-outline" size={24} color="#E3BBA1" />
								<View className="ml-4 flex-1">
									<Text className="text-white font-JakartaSemiBold">Visit Support Center</Text>
									<Text className="text-gray-400 text-sm">Browse detailed guides</Text>
								</View>
								<Ionicons name="chevron-forward" size={20} color="gray" />
							</TouchableOpacity> */}
						</View>
					</View>

					{/* FAQ Section */}
					<View className="mb-6">
						<Text className="text-white text-lg font-JakartaSemiBold mb-4">
							Frequently Asked Questions
						</Text>
						<View className="space-y-3">
							{faqData.map(faq => (
								<View key={faq.id} className="bg-[#2D2A3F] rounded-xl overflow-hidden">
									<TouchableOpacity
										onPress={() => toggleFAQ(faq.id)}
										className="p-4 flex flex-row items-center justify-between"
									>
										<Text className="text-white font-JakartaSemiBold flex-1 mr-4">
											{faq.question}
										</Text>
										<Ionicons
											name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
											size={20}
											color="#E3BBA1"
										/>
									</TouchableOpacity>
									{expandedFAQ === faq.id && (
										<View className="px-4 pb-4">
											<Text className="text-gray-400 text-sm leading-6">{faq.answer}</Text>
										</View>
									)}
								</View>
							))}
						</View>
					</View>

					{/* Contact Information */}
					<View className="bg-[#2D2A3F] rounded-2xl p-6 mb-6">
						<Text className="text-white text-lg font-JakartaSemiBold mb-4 text-center">
							Get in Touch
						</Text>
						<View className="space-y-3">
							<View className="flex flex-row items-center">
								<Ionicons name="mail" size={20} color="#E3BBA1" />
								<Text className="text-gray-400 ml-3">support@fortia.app</Text>
							</View>
							<View className="flex flex-row items-center">
								<Ionicons name="globe" size={20} color="#E3BBA1" />
								<Text className="text-gray-400 ml-3">fortia.app/support</Text>
							</View>
							<View className="flex flex-row items-center">
								<Ionicons name="time" size={20} color="#E3BBA1" />
								<Text className="text-gray-400 ml-3">24/7 Support Available</Text>
							</View>
						</View>
					</View>

					{/* App Version */}
					<View className="mb-6">
						<Text className="text-gray-500 text-xs text-center">
							Fortia v1.0.0 • Made with ❤️ for your wellness journey
						</Text>
					</View>
				</ScrollView>
			</View>
		</>
	);
};

export default HelpSupport;
