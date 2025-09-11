import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';

interface CaloriesBurnedDataPoint {
	label: string;
	value: number;
	dataPointText: string;
}

interface CaloriesBurnedChartProps {
	refreshTrigger?: number;
}

interface DailyCaloriesBurned {
	date: string;
	total_calories_burned: number;
}

const CaloriesBurnedChart: React.FC<CaloriesBurnedChartProps> = ({ refreshTrigger = 0 }) => {
	const [chartData, setChartData] = useState<CaloriesBurnedDataPoint[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastFetchTrigger, setLastFetchTrigger] = useState(0);
	const { user } = useUser();

	// Generate last 7 days including today
	const getLast7Days = () => {
		const days = [];
		const today = new Date();

		// Generate 7 days: 6 days ago, 5 days ago, ..., yesterday, today
		for (let i = 6; i >= 0; i--) {
			const date = new Date(today);
			date.setDate(today.getDate() - i);

			// Format date as YYYY-MM-DD for API using local timezone
			const dateString = date.toLocaleDateString('en-CA');

			// Format display label (e.g., "Mon", "Tue", "Wed")
			const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

			days.push({
				dateString,
				dayLabel,
			});
		}

		return days;
	};

	// Calculate dynamic max value for the chart
	const getMaxValue = () => {
		if (chartData.length === 0) return 2000;
		const maxCalories = Math.max(...chartData.map(d => d.value));
		// Round up to nearest 500 for better chart scaling
		return Math.ceil(maxCalories / 500) * 500 || 2000;
	};

	// Fetch calories burned data for the last 7 days
	const fetchCaloriesBurnedData = async () => {
		if (!user?.id) return;

		setIsLoading(true);
		setError(null);

		try {
			const days = getLast7Days();
			const caloriesBurnedData: CaloriesBurnedDataPoint[] = [];

			// Fetch data for each day
			for (const day of days) {
				try {
					// Fetch activities for the day
					const activitiesResponse = await fetchAPI(
						`/api/activities?clerkId=${user.id}&date=${day.dateString}`,
						{
							method: 'GET',
						}
					);

					// Fetch workouts for the day
					const workoutsResponse = await fetchAPI(
						`/api/workouts?clerkId=${user.id}&date=${day.dateString}`,
						{
							method: 'GET',
						}
					);

					let totalCaloriesBurned = 0;

					// Sum calories from activities (include BMR and Steps for accurate total)
					if (activitiesResponse.success && activitiesResponse.data) {
						activitiesResponse.data.forEach((activity: any) => {
							if (activity.estimated_calories) {
								totalCaloriesBurned += activity.estimated_calories;
							}
						});
					}

					// Sum calories from workout exercises
					if (workoutsResponse.success && workoutsResponse.data) {
						workoutsResponse.data.forEach((workout: any) => {
							if (workout.exercises) {
								workout.exercises.forEach((exercise: any) => {
									if (exercise.calories_burned) {
										totalCaloriesBurned += exercise.calories_burned;
									}
								});
							}
						});
					}

					caloriesBurnedData.push({
						label: day.dayLabel,
						value: totalCaloriesBurned,
						dataPointText: totalCaloriesBurned > 0 ? totalCaloriesBurned.toString() : '',
					});
				} catch (dayError) {
					// If individual day fails, add 0 for that day
					caloriesBurnedData.push({
						label: day.dayLabel,
						value: 0,
						dataPointText: '',
					});
				}
			}

			setChartData(caloriesBurnedData);
			setLastFetchTrigger(refreshTrigger);
		} catch (error) {
			setError('Failed to fetch calories burned data');
		} finally {
			setIsLoading(false);
		}
	};

	// Effect to fetch data when component mounts or refreshTrigger changes
	useEffect(() => {
		if (user?.id) {
			// Initial fetch when component mounts or user changes
			if (lastFetchTrigger === 0) {
				fetchCaloriesBurnedData();
			}
			// Subsequent fetches when refreshTrigger changes
			else if (refreshTrigger !== lastFetchTrigger) {
				fetchCaloriesBurnedData();
			}
		}
	}, [user?.id, refreshTrigger, lastFetchTrigger]);

	if (isLoading) {
		return (
			<View className="flex-1 justify-center items-center">
				<ActivityIndicator size="large" color="#E3BBA1" />
				<Text className="text-secondary-600 font-Jakarta text-sm mt-2">
					Loading calories burned data...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="flex-1 justify-center items-center">
				<Text className="text-red-500 font-JakartaSemiBold text-center">{error}</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 p-2">
			{/* Chart Title and Target */}
			<View className="flex-row justify-center items-center mb-2">
				<Text className="text-secondary-800 font-JakartaSemiBold text-xs">
					7-Day Calories Burned
				</Text>
			</View>

			{/* Chart */}
			<View className="flex-1 pt-2 w-[90%] overflow-hidden mx-auto items-center">
				<BarChart
					data={chartData}
					height={160}
					barWidth={18}
					initialSpacing={10}
					endSpacing={10}
					spacing={20}
					noOfSections={4}
					barBorderTopLeftRadius={8}
					barBorderTopRightRadius={8}
					frontColor="#E3BBA1"
					yAxisColor="#E5E5E5"
					xAxisColor="#E5E5E5"
					rulesColor="#E5E5E5"
					rulesType="solid"
					backgroundColor="transparent"
					maxValue={getMaxValue()}
					yAxisLabelSuffix="cal"
					yAxisLabelWidth={32}
					showVerticalLines={false}
					animationDuration={1000}
					showValuesAsTopLabel={true}
					topLabelTextStyle={{
						color: '#666666',
						fontSize: 8,
						textAlign: 'center',
						width: '120%',
					}}
					yAxisTextStyle={{
						color: '#666666',
						fontSize: 7,
						textAlign: 'left',
					}}
					xAxisLabelTextStyle={{ color: '666666', fontSize: 8 }}
				/>
			</View>
		</View>
	);
};

export default CaloriesBurnedChart;
