import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from './fetch';
import { getTodayDate } from './dateUtils';

interface DailyQuest {
	id?: number;
	clerk_id: string;
	date: string;
	weight_logged: boolean;
	meal_logged: boolean;
	exercise_logged: boolean;
	day_completed: boolean;
	streak_day: number;
	created_at?: string;
	updated_at?: string;
}

interface UseDailyQuestsReturn {
	questData: DailyQuest | null;
	isLoading: boolean;
	error: string | null;
	refreshQuests: () => Promise<void>;
	streakDay: number;
	questStatus: {
		weight: boolean;
		meal: boolean;
		exercise: boolean;
		allCompleted: boolean;
	};
}

export const useDailyQuests = (refreshTrigger?: number): UseDailyQuestsReturn => {
	const { user } = useUser();
	const [questData, setQuestData] = useState<DailyQuest | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchQuests = async () => {
		if (!user?.id) {
			setError('User not authenticated');
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			const response = await fetchAPI(
				`/api/daily-quests?clerkId=${user.id}&date=${getTodayDate()}`
			);

			if (response.success) {
				setQuestData(response.data);
			} else {
				setError('Failed to fetch quest data');
			}
		} catch (err) {
			console.error('Error fetching daily quests:', err);
			setError('Failed to fetch quest data');
		} finally {
			setIsLoading(false);
		}
	};

	const refreshQuests = async () => {
		await fetchQuests();
	};

	useEffect(() => {
		fetchQuests();
	}, [user?.id, refreshTrigger]);

	const questStatus = {
		weight: questData?.weight_logged || false,
		meal: questData?.meal_logged || false,
		exercise: questData?.exercise_logged || false,
		allCompleted:
			(questData?.weight_logged && questData?.meal_logged && questData?.exercise_logged) || false,
	};

	return {
		questData,
		isLoading,
		error,
		refreshQuests,
		streakDay: questData?.streak_day || 1,
		questStatus,
	};
};
