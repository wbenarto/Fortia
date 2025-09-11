import { View, Text, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';

interface MiniDashboardTrackingProps {
	totalMealsLog?: number;
	totalWeightsLog?: number;
	totalExercisesLog?: number;
	refreshTrigger?: number;
}

interface DashboardCounts {
	totalMeals: number;
	totalWeights: number;
	totalExercises: number;
}

const MiniDashboardTracking: React.FC<MiniDashboardTrackingProps> = ({ refreshTrigger = 0 }) => {
	const [counts, setCounts] = useState<DashboardCounts>({
		totalMeals: 0,
		totalWeights: 0,
		totalExercises: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [lastFetchTrigger, setLastFetchTrigger] = useState(0);
	const { user } = useUser();

	const fetchDashboardCounts = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		try {
			const response = await fetchAPI(`/api/dashboard-counts?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success) {
				setCounts(response.data);
				setLastFetchTrigger(refreshTrigger);
			} else {
				// Set default values on error
				setCounts({
					totalMeals: 0,
					totalWeights: 0,
					totalExercises: 0,
				});
			}
		} catch (error) {
			// Set default values on error
			setCounts({
				totalMeals: 0,
				totalWeights: 0,
				totalExercises: 0,
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (user?.id) {
			// Initial fetch when component mounts or user changes
			if (lastFetchTrigger === 0) {
				fetchDashboardCounts();
			}
			// Subsequent fetches when refreshTrigger changes
			else if (refreshTrigger !== lastFetchTrigger) {
				fetchDashboardCounts();
			}
		}
	}, [user?.id, refreshTrigger, lastFetchTrigger]);

	if (isLoading) {
		return (
			<View className="w-full h-20 mt-2 flex flex-row px-10 space-x-4 justify-center items-center">
				<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm h-full flex justify-center items-center">
					<ActivityIndicator size="small" color="#E3BBA1" />
				</View>
				<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm h-full flex justify-center items-center">
					<ActivityIndicator size="small" color="#E3BBA1" />
				</View>
				<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm h-full flex justify-center items-center">
					<ActivityIndicator size="small" color="#E3BBA1" />
				</View>
			</View>
		);
	}
	return (
		<View className="w-full h-20 mt-2 flex flex-row px-10 space-x-4 justify-center items-center">
			<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm h-full flex justify-center items-center">
				<Text className="font-JakartaSemiBold text-lg mb-1">{counts.totalWeights}</Text>
				<Text className="text-secondary-800 font-Jakarta text-[10px] leading-tight">
					Weights Logged
				</Text>
			</View>
			<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm h-full flex justify-center items-center">
				<Text className="font-JakartaSemiBold text-lg mb-1">{counts.totalMeals}</Text>
				<Text className="text-secondary-800 font-Jakarta text-[10px] leading-tight">
					Meals Logged
				</Text>
			</View>
			<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm h-full flex justify-center items-center">
				<Text className="font-JakartaSemiBold text-lg mb-1">{counts.totalExercises}</Text>
				<Text className="text-secondary-800 font-Jakarta text-[10px] leading-tight">
					Exercises Logged
				</Text>
			</View>
		</View>
	);
};

export default MiniDashboardTracking;
