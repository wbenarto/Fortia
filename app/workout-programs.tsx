import { Stack } from 'expo-router';
import WorkoutProgramScreen from '@/components/WorkoutProgramScreen';

export default function WorkoutProgramsPage() {
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<WorkoutProgramScreen />
		</>
	);
}
