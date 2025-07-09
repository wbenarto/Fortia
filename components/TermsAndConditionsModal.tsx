import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';

interface TermsAndConditionsModalProps {
	isVisible: boolean;
	onClose: () => void;
}

const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
	isVisible,
	onClose,
}) => {
	return (
		<ReactNativeModal isVisible={isVisible} onBackdropPress={onClose}>
			<View className="bg-white py-6 px-4 mx-2 rounded-2xl" style={{ maxHeight: '85%' }}>
				{/* Header */}
				<View className="flex flex-row items-center justify-between mb-4">
					<Text className="text-xl font-JakartaSemiBold text-gray-800">Terms and Conditions</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={24} color="#64748B" />
					</TouchableOpacity>
				</View>

				{/* Content */}
				<ScrollView className="mb-4" showsVerticalScrollIndicator={true} style={{ maxHeight: 400 }}>
					<Text className="text-gray-600 text-xs mb-4">Last Updated: December 2024</Text>

					<Text className="text-gray-700 text-sm leading-6 mb-4">
						Welcome to Fortia! These Terms and Conditions ("Terms") govern your use of the Fortia
						mobile application ("App") and related services ("Services") provided by Fortia ("we,"
						"us," or "our").
					</Text>

					<Text className="text-gray-700 text-sm leading-6 mb-4">
						By downloading, installing, or using the Fortia app, you agree to be bound by these
						Terms. If you do not agree to these Terms, please do not use our Services.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						1. Acceptance of Terms
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						By accessing or using the Fortia app, you confirm that you accept these Terms and agree
						to comply with them. If you are using the Services on behalf of a company or other legal
						entity, you represent that you have the authority to bind such entity to these Terms.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						2. Description of Services
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						Fortia is a comprehensive fitness and nutrition tracking application that provides:
					</Text>
					<View className="mb-4 ml-4">
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• AI-powered meal analysis and nutritional breakdown
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Smart weight tracking with progress visualization
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Personalized nutrition goals and BMR/TDEE calculations
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Activity tracking and step counting
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Workout logging and calorie burn calculations
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Progress visualization and interactive charts
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• User authentication and profile management
						</Text>
					</View>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						3. User Accounts and Registration
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">3.1 Account Creation:</Text> To use certain
						features of the App, you must create an account. You agree to provide accurate, current,
						and complete information during registration and to update such information to keep it
						accurate, current, and complete.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">3.2 Account Security:</Text> You are responsible
						for safeguarding your account credentials and for all activities that occur under your
						account. You agree to notify us immediately of any unauthorized use of your account.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">3.3 Age Requirements:</Text> You must be at least
						13 years old to use the Services. If you are under 18, you must have parental or
						guardian consent to use the Services.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						4. Subscription and Payment Terms
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">4.1 Free and Premium Services:</Text> Fortia
						offers both free and premium subscription tiers. Premium features require a paid
						subscription.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">4.2 Subscription Plans:</Text>
					</Text>
					<View className="mb-2 ml-4">
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Basic Plan: $4.99/month - Core features + basic analytics
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Pro Plan: $9.99/month - Advanced analytics + meal planning
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Elite Plan: $19.99/month - Personal coaching + priority support
						</Text>
					</View>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">4.3 Payment and Billing:</Text> Subscriptions are
						billed on a recurring basis. You authorize us to charge your payment method for all fees
						incurred. All payments are non-refundable except as required by law.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">4.4 Subscription Cancellation:</Text> You may
						cancel your subscription at any time through your device's subscription settings.
						Cancellation will take effect at the end of the current billing period.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						5. User Data and Privacy
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">5.1 Data Collection:</Text> We collect and
						process personal data as described in our Privacy Policy. This includes health and
						fitness data, usage information, and device information.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">5.2 Health Data Consent:</Text> By using the App,
						you consent to the collection and processing of your health and fitness data, including
						but not limited to weight, activity levels, and nutritional information.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">5.3 Data Accuracy:</Text> You are responsible for
						the accuracy of the data you input into the App. We are not responsible for any
						decisions made based on inaccurate or incomplete data.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						6. Acceptable Use Policy
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">6.1 Prohibited Activities:</Text> You agree not
						to:
					</Text>
					<View className="mb-2 ml-4">
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Use the Services for any illegal or unauthorized purpose
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Attempt to gain unauthorized access to our systems
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Interfere with or disrupt the Services
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Share your account credentials with others
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Use the Services to harm yourself or others
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Upload malicious code or content
						</Text>
					</View>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">6.2 Medical Disclaimer:</Text> The information
						provided by Fortia is for educational and informational purposes only. It is not
						intended as medical advice, diagnosis, or treatment. Always consult with qualified
						healthcare professionals before making changes to your diet or exercise routine.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						7. Artificial Intelligence and Machine Learning
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">7.1 AI-Powered Features:</Text> Fortia utilizes
						artificial intelligence and machine learning algorithms to provide meal analysis,
						nutritional recommendations, and personalized insights. You acknowledge that:
					</Text>
					<View className="mb-2 ml-4">
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• AI-generated content is for informational purposes only and may not be 100% accurate
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• Nutritional estimates are approximations based on available data
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• AI recommendations should not replace professional medical or nutritional advice
						</Text>
						<Text className="text-gray-700 text-sm leading-6 mb-1">
							• We continuously improve our AI models, which may affect the accuracy of historical
							data
						</Text>
					</View>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">7.2 Data Training:</Text> You grant us permission
						to use anonymized, aggregated data to improve our AI algorithms and services, provided
						such use does not identify you personally.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						8. Health Information and Medical Data
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">8.1 Health Data Classification:</Text> Fortia is
						not a covered entity under HIPAA. The health data you input is not considered Protected
						Health Information (PHI) under HIPAA regulations. However, we treat your health data
						with appropriate security measures.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">8.2 Medical Emergency Disclaimer:</Text> Fortia
						is not designed for medical emergencies. If you experience a medical emergency, contact
						emergency services immediately. Do not rely on the App for emergency medical information
						or assistance.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">8.3 Health Data Retention:</Text> Your health
						data will be retained in accordance with our Privacy Policy. You may request deletion of
						your health data at any time, subject to legal retention requirements.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						9. Disclaimers and Limitations of Liability
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">9.1 Service Availability:</Text> We strive to
						provide reliable Services but cannot guarantee uninterrupted access. The Services are
						provided "as is" without warranties of any kind.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">9.2 Limitation of Liability:</Text> To the
						maximum extent permitted by law, Fortia shall not be liable for any indirect,
						incidental, special, consequential, or punitive damages arising from your use of the
						Services.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">9.3 Health and Safety:</Text> You acknowledge
						that fitness and nutrition activities carry inherent risks. You assume all
						responsibility for your health and safety while using the App.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">10. Termination</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">10.1 Termination by You:</Text> You may terminate
						your account at any time by deleting the App or contacting us.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-2">
						<Text className="font-JakartaSemiBold">10.2 Termination by Us:</Text> We may terminate
						or suspend your access to the Services at any time for violation of these Terms or for
						any other reason at our sole discretion.
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						<Text className="font-JakartaSemiBold">10.3 Effect of Termination:</Text> Upon
						termination, your right to use the Services will cease immediately. We may delete your
						account and data in accordance with our Privacy Policy.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						11. Changes to Terms
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						We reserve the right to modify these Terms at any time. We will notify you of material
						changes by posting the updated Terms in the App or by other means. Your continued use of
						the Services after such changes constitutes acceptance of the new Terms.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						12. Governing Law and Dispute Resolution
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						These Terms are governed by the laws of the jurisdiction where Fortia is incorporated.
						Any disputes arising from these Terms or your use of the Services shall be resolved
						through binding arbitration in accordance with the rules of the American Arbitration
						Association.
					</Text>

					<Text className="text-gray-800 text-base font-JakartaSemiBold mb-2">
						13. Contact Information
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						For questions about these Terms and Conditions, please contact us at:
					</Text>
					<Text className="text-gray-700 text-sm leading-6 mb-4">
						Email: legal@fortia.app{'\n'}
						Website: https://fortia.app
					</Text>

					<Text className="text-gray-600 text-sm italic text-center mb-4">
						Fortia - Wellness Beyond.
					</Text>
				</ScrollView>

				{/* Close Button */}
				<TouchableOpacity onPress={onClose} className="bg-[#E3BBA1] py-3 px-6 rounded-xl">
					<Text className="text-white font-JakartaSemiBold text-center">Close</Text>
				</TouchableOpacity>
			</View>
		</ReactNativeModal>
	);
};

export default TermsAndConditionsModal;
