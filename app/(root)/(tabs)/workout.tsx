import { SignedIn } from '@clerk/clerk-expo';
import { View, Text, ScrollView } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActivityTracking from '@/components/ActivityTracking';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '@/components/CustomButton';
import WorkoutScheduleCard from '@/components/WorkoutScheduleCard';
import NewWorkoutModal from '@/components/NewWorkoutModal';
import { SCREEN_BG } from '@/lib/theme';

const Workout = () => {
	const insets = useSafeAreaInsets();
	const [workoutModal, setWorkoutModal] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const handleWorkoutModal = () => {
		setWorkoutModal(!workoutModal);
	};

	const scheduledWorkout = [
		{
			id: 1,
			name: 'Full Body Circuit',
			description: 'This is a full body circuit workout',
			date: '2025-06-25',
			time: '10:00 AM',
			duration: '1 hour',
			totalCaloriesBurned: 625,
			exercises: [
				{
					id: 1,
					name: 'Push-ups',
					sets: 3,
					reps: 10,
					caloriesBurned: 125,
				},
				{
					id: 2,
					name: 'Pull-ups',
					sets: 3,
					reps: 10,
					caloriesBurned: 125,
				},
				{
					id: 3,
					name: 'Squats',
					sets: 3,
					reps: 10,
					caloriesBurned: 125,
				},
				{
					id: 4,
					name: 'Lunges',
					sets: 3,
					reps: 10,
					caloriesBurned: 125,
				},
				{
					id: 5,
					name: 'Planks',
					sets: 3,
					reps: 10,
					caloriesBurned: 125,
				},
			],
		},
		{
			id: 2,
			name: 'Upper Body Strength',
			description: 'Focus on chest, back, and arms',
			date: '2025-06-27',
			time: '8:00 AM',
			duration: '45 min',
			totalCaloriesBurned: 480,
			exercises: [
				{
					id: 6,
					name: 'Bench Press',
					sets: 4,
					reps: 8,
					caloriesBurned: 120,
				},
				{
					id: 7,
					name: 'Lat Pulldowns',
					sets: 4,
					reps: 12,
					caloriesBurned: 100,
				},
				{
					id: 8,
					name: 'Shoulder Press',
					sets: 3,
					reps: 10,
					caloriesBurned: 90,
				},
				{
					id: 9,
					name: 'Bicep Curls',
					sets: 3,
					reps: 12,
					caloriesBurned: 80,
				},
				{
					id: 10,
					name: 'Tricep Dips',
					sets: 3,
					reps: 15,
					caloriesBurned: 90,
				},
			],
		},
		{
			id: 3,
			name: 'Lower Body & Core',
			description: 'Legs, glutes, and core workout',
			date: '2025-06-29',
			time: '6:30 PM',
			duration: '50 min',
			totalCaloriesBurned: 550,
			exercises: [
				{
					id: 11,
					name: 'Deadlifts',
					sets: 4,
					reps: 8,
					caloriesBurned: 140,
				},
				{
					id: 12,
					name: 'Leg Press',
					sets: 4,
					reps: 12,
					caloriesBurned: 120,
				},
				{
					id: 13,
					name: 'Romanian Deadlifts',
					sets: 3,
					reps: 10,
					caloriesBurned: 100,
				},
				{
					id: 14,
					name: 'Calf Raises',
					sets: 3,
					reps: 20,
					caloriesBurned: 60,
				},
				{
					id: 15,
					name: 'Russian Twists',
					sets: 3,
					reps: 30,
					caloriesBurned: 80,
				},
				{
					id: 16,
					name: 'Mountain Climbers',
					sets: 3,
					reps: 20,
					caloriesBurned: 50,
				},
			],
		},
	];
	return (
		<View
			className="flex-1"
			style={{ flex: 1, backgroundColor: SCREEN_BG, paddingTop: insets.top }}
		>
			<SignedIn>
				<ScrollView
					className="w-full h-full"
					style={{ backgroundColor: SCREEN_BG }}
					contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, backgroundColor: SCREEN_BG }}
				>
					<ActivityTracking refreshTrigger={refreshTrigger} />
				</ScrollView>

				{/* New Workout Modal */}
				<NewWorkoutModal
					isVisible={workoutModal}
					onClose={() => setWorkoutModal(false)}
					onSaved={() => setRefreshTrigger(prev => prev + 1)}
				/>
			</SignedIn>
		</View>
	);
};

export default Workout;
