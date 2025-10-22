import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import WorkoutProgramDetailScreen from '@/components/WorkoutProgramDetailScreen';

export default function WorkoutProgramDetailPage() {
	const { id } = useLocalSearchParams();
	console.log('Route id parameter:', id, 'Type:', typeof id);

	// Ensure id is a string and not undefined
	const programId = Array.isArray(id) ? id[0] : id;
	console.log('Processed programId:', programId, 'Type:', typeof programId);

	if (!programId) {
		console.log('No programId found, showing error screen');
		return (
			<>
				<Stack.Screen options={{ headerShown: false }} />
				<View className="flex-1 bg-white items-center justify-center">
					<Text className="text-gray-500">Program not found</Text>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<WorkoutProgramDetailScreen programId={programId} />
		</>
	);
}
