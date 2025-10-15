import { Stack } from 'expo-router';

import WorkoutSessionDetailScreen from '@/components/WorkoutSessionDetailScreen';

export default function WorkoutSessionDetailPage() {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<WorkoutSessionDetailScreen />
		</>
	);
}
