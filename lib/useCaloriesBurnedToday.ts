import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { getUnifiedBMR } from '@/lib/unifiedBMRCalculator';

interface Activity {
	activity_description?: string;
	estimated_calories?: number;
}

interface WorkoutExercise {
	calories_burned?: number;
}

interface Workout {
	exercises?: WorkoutExercise[];
}

// Same calculation ActivityTracking.tsx uses for "Calories Burned": BMR + steps +
// logged activities + logged exercises. Kept here as the single source of truth so
// any other widget showing calories burned stays in sync with it.
export const useCaloriesBurnedToday = (userId: string | undefined, date: string = getTodayDate()) => {
	const [bmr, setBmr] = useState(0);
	const [stepCalories, setStepCalories] = useState(0);
	const [activitiesCalories, setActivitiesCalories] = useState(0);
	const [exercisesCalories, setExercisesCalories] = useState(0);
	const [isLoading, setIsLoading] = useState(false);

	const refresh = useCallback(async () => {
		if (!userId) return;

		setIsLoading(true);
		try {
			const [bmrValue, stepsRes, activitiesRes, workoutsRes] = await Promise.all([
				getUnifiedBMR(userId).catch(() => 0),
				fetchAPI(`/api/steps?clerkId=${userId}&date=${date}`, { method: 'GET' }).catch(() => null),
				fetchAPI(`/api/activities?clerkId=${userId}&date=${date}`, { method: 'GET' }).catch(
					() => null
				),
				fetchAPI(`/api/workouts?clerkId=${userId}&date=${date}`, { method: 'GET' }).catch(() => null),
			]);

			setBmr(bmrValue || 0);

			const stepRow = stepsRes?.success && stepsRes.data?.[0] ? stepsRes.data[0] : null;
			setStepCalories(stepRow?.calories_burned || 0);

			const activities: Activity[] = activitiesRes?.success ? activitiesRes.data || [] : [];
			const activitiesTotal = activities.reduce((total, activity) => {
				const description = activity.activity_description?.toLowerCase() || '';
				// Skip BMR/Steps entries logged as activities to avoid double counting.
				if (description.includes('basal metabolic rate') || description.includes('daily steps')) {
					return total;
				}
				return total + (activity.estimated_calories || 0);
			}, 0);
			setActivitiesCalories(activitiesTotal);

			const workouts: Workout[] = workoutsRes?.success ? workoutsRes.workouts || [] : [];
			const exercisesTotal = workouts.reduce((total, workout) => {
				const workoutCalories = (workout.exercises || []).reduce(
					(sum, exercise) => sum + (exercise.calories_burned || 0),
					0
				);
				return total + workoutCalories;
			}, 0);
			setExercisesCalories(exercisesTotal);
		} catch (error) {
			console.error('Failed to fetch calories burned:', error);
		} finally {
			setIsLoading(false);
		}
	}, [userId, date]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const totalCaloriesBurned = useMemo(
		() => bmr + stepCalories + activitiesCalories + exercisesCalories,
		[bmr, stepCalories, activitiesCalories, exercisesCalories]
	);

	return { totalCaloriesBurned, isLoading, refresh };
};
