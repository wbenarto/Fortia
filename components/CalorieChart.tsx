import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { useUserProfile } from '@/lib/userUtils';

interface CalorieDataPoint {
	label: string;
	value: number;
	dataPointText: string;
}

interface CalorieChartProps {
	refreshTrigger?: number;
}

interface DailySummary {
	total_calories: number;
	total_protein: number;
	total_carbs: number;
	total_fats: number;
	total_fiber: number;
	total_sugar: number;
	total_sodium: number;
	meal_count: number;
}

const CalorieChart: React.FC<CalorieChartProps> = ({ refreshTrigger = 0 }) => {
	const [chartData, setChartData] = useState<CalorieDataPoint[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastFetchDate, setLastFetchDate] = useState<string>('');
	const { user } = useUser();
	const userProfile = useUserProfile();

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

			// Get day abbreviation for chart labels (Mon, Tue, Wed, etc.)
			const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' });

			// Get day number for more context
			const dayNumber = date.getDate();

			days.push({
				dateString,
				dayAbbr,
				dayNumber,
				date,
			});
		}

		return days;
	};

	// Fetch calorie data for the last 7 days
	const fetchCalorieData = async (forceRefresh = false) => {
		if (!user?.id) return;

		// Check if we need to refresh based on date or refresh trigger
		const today = getTodayDate();
		const shouldRefresh = forceRefresh || lastFetchDate !== today || refreshTrigger > 0;

		// If we have cached data and don't need to refresh, return early
		if (chartData.length > 0 && !shouldRefresh) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const last7Days = getLast7Days();
			const calorieData: CalorieDataPoint[] = [];

			// Fetch data for each day
			for (const day of last7Days) {
				try {
					const response = await fetchAPI(
						`/api/meals?clerkId=${user.id}&date=${day.dateString}&summary=true`,
						{
							method: 'GET',
						}
					);

					if (response.success) {
						const summary: DailySummary = response.data;
						calorieData.push({
							label: day.dayAbbr,
							value: Number(summary.total_calories),
							dataPointText: summary.total_calories > 0 ? `${summary.total_calories}` : '',
						});
					} else {
						// If no data for this day, add 0 calories
						calorieData.push({
							label: day.dayAbbr,
							value: 0,
							dataPointText: '',
						});
					}
				} catch (dayError) {
					// Add 0 calories for failed requests
					calorieData.push({
						label: day.dayAbbr,
						value: 0,
						dataPointText: '',
					});
				}
			}

			setChartData(calorieData);
			setLastFetchDate(today); // Cache the fetch date
		} catch (error) {
			setError('Failed to load calorie data');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (user?.id) {
			fetchCalorieData();
		}
	}, [user?.id, refreshTrigger]);

	// Calculate max value for chart scaling
	const getMaxValue = () => {
		if (chartData.length === 0) return 2000;
		const maxCalories = Math.max(...chartData.map(d => d.value));
		// Round up to nearest 500 for better chart scaling
		return Math.ceil(maxCalories / 500) * 500 || 2000;
	};

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator size="large" color="#E3BBA1" />
				<Text className="text-gray-500 mt-2">Loading calorie data...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="flex-1 items-center justify-center">
				<Text className="text-red-500 text-center">{error}</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 p-2">
			<View className="flex flex-row items-center justify-between w-full">
				<View className="flex-1" />
				<Text className="text-xs font-JakartaSemiBold text-secondary-800 mb-1 text-center">
					7-Day Calorie Intake
				</Text>
				<View className="flex-1 items-end">
					{/* Target Line Indicator */}
					{userProfile?.dailyCalories && (
						<Text className="text-[8px] text-secondary-600 mr-2 font-JakartaSemiBold">
							Daily Target: {userProfile.dailyCalories} cal
						</Text>
					)}
				</View>
			</View>

			<View className="flex-1 pt-2 w-[90%] overflow-hidden mx-auto items-center justify-center">
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
					formatYLabel={value => Math.round(Number(value)).toString()}
					xAxisLabelTextStyle={{ color: '666666', fontSize: 8 }}
				/>
			</View>
		</View>
	);
};

export default CalorieChart;
