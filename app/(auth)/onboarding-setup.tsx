import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingForm from '../../components/OnboardingForm';

const OnboardingSetup = () => {
	const handleComplete = () => {
		// This will be handled by the OnboardingForm component
		// which will redirect to the home tab
	};

	return (
		<SafeAreaView className="flex-1 bg-[#262135]">
			<OnboardingForm onComplete={handleComplete} />
		</SafeAreaView>
	);
};

export default OnboardingSetup;
