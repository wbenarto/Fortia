import { Stack } from 'expo-router';

import ExerciseExecutionScreen from '@/components/ExerciseExecutionScreen';

export default function WorkoutExecutionPage() {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<ExerciseExecutionScreen />
		</>
	);
}
