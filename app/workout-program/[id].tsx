import { useLocalSearchParams, Stack } from 'expo-router';
import WorkoutProgramDetailScreen from '@/components/WorkoutProgramDetailScreen';

export default function WorkoutProgramDetailPage() {
	const { id } = useLocalSearchParams();
	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<WorkoutProgramDetailScreen programId={id as string} />
		</>
	);
}
