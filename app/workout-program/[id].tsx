import { useLocalSearchParams } from 'expo-router';
import WorkoutProgramScreen from '@/components/WorkoutProgramScreen';

export default function WorkoutProgramDetailPage() {
	const { id } = useLocalSearchParams();
	return <WorkoutProgramScreen programId={id as string} />;
}

