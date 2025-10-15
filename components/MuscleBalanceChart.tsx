import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';

interface MuscleBalance {
	chest: string;
	back: string;
	legs: string;
	shoulders: string;
	arms: string;
	core: string;
}

interface VolumeData {
	workout_date: string;
	chest_volume: number;
	back_volume: number;
	legs_volume: number;
	shoulders_volume: number;
	arms_volume: number;
	core_volume: number;
	total_volume: number;
}

interface WeeklyTrend {
	week: string;
	chest: number;
	back: number;
	legs: number;
	shoulders: number;
	arms: number;
	core: number;
	total: number;
}

interface MuscleBalanceData {
	balance: MuscleBalance;
	volumeHistory: VolumeData[];
	weeklyTrends: WeeklyTrend[];
}

const MUSCLE_COLORS = {
	chest: '#EF4444',
	back: '#3B82F6',
	legs: '#10B981',
	shoulders: '#F59E0B',
	arms: '#8B5CF6',
	core: '#F97316',
};

const ProgressBar = ({ label, value, color }: { label: string; value: string; color: string }) => (
	<View className="mb-3">
		<View className="flex-row justify-between items-center mb-1">
			<Text className="font-JakartaSemiBold text-gray-700 capitalize">{label}</Text>
			<Text className="font-JakartaBold text-gray-800">{value}%</Text>
		</View>
		<View className="h-3 bg-gray-200 rounded-full overflow-hidden">
			<View
				className="h-full rounded-full"
				style={{
					width: `${value}%`,
					backgroundColor: color,
				}}
			/>
		</View>
	</View>
);

export default function MuscleBalanceChart() {
	const { user } = useUser();
	const [selectedPeriod, setSelectedPeriod] = useState<'all-time' | 'month' | 'week'>('all-time');
	const [balanceData, setBalanceData] = useState<MuscleBalanceData | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchMuscleBalance = async (period: string) => {
		if (!user) return;

		try {
			const result = await fetchAPI(`/api/muscle-balance?clerkId=${user.id}&period=${period}`);

			if (result.success) {
				setBalanceData(result.data);
			}
		} catch (error) {
			console.error('Failed to fetch muscle balance:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchMuscleBalance(selectedPeriod);
	}, [user, selectedPeriod]);

	const getPeriodLabel = (period: string) => {
		switch (period) {
			case 'all-time':
				return 'All-Time';
			case 'month':
				return 'This Month';
			case 'week':
				return 'This Week';
			default:
				return 'All-Time';
		}
	};

	if (loading) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Text className="text-gray-500">Loading muscle balance...</Text>
			</View>
		);
	}

	if (!balanceData) {
		return (
			<View className="flex-1 bg-white items-center justify-center">
				<Ionicons name="fitness" size={64} color="#9CA3AF" />
				<Text className="text-xl font-JakartaSemiBold text-gray-600 mt-4 mb-2">
					No Workout Data
				</Text>
				<Text className="text-gray-500 text-center">
					Complete some workouts to see your muscle balance
				</Text>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-white">
			{/* Header */}
			<View className="p-6 border-b border-gray-200">
				<Text className="text-2xl font-JakartaBold text-gray-800 mb-4">Muscle Balance</Text>

				{/* Period Selector */}
				<View className="flex-row bg-gray-100 rounded-xl p-1">
					{(['all-time', 'month', 'week'] as const).map(period => (
						<TouchableOpacity
							key={period}
							onPress={() => setSelectedPeriod(period)}
							className={`flex-1 py-2 rounded-lg ${
								selectedPeriod === period ? 'bg-white shadow-sm' : ''
							}`}
						>
							<Text
								className={`font-JakartaSemiBold text-center ${
									selectedPeriod === period ? 'text-blue-600' : 'text-gray-600'
								}`}
							>
								{getPeriodLabel(period)}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<ScrollView className="flex-1">
				{/* Balance Overview */}
				<View className="p-6">
					<Text className="text-lg font-JakartaBold text-gray-800 mb-4">
						{getPeriodLabel(selectedPeriod)} Balance
					</Text>

					<View className="bg-gray-50 rounded-xl p-4">
						{Object.entries(balanceData.balance).map(([muscle, percentage]) => (
							<ProgressBar
								key={muscle}
								label={muscle}
								value={percentage}
								color={MUSCLE_COLORS[muscle as keyof typeof MUSCLE_COLORS]}
							/>
						))}
					</View>
				</View>

				{/* Weekly Trends */}
				{balanceData.weeklyTrends.length > 0 && (
					<View className="p-6">
						<Text className="text-lg font-JakartaBold text-gray-800 mb-4">12-Week Trends</Text>

						<View className="bg-gray-50 rounded-xl p-4">
							{balanceData.weeklyTrends.slice(0, 8).map((week, index) => (
								<View key={index} className="mb-4 last:mb-0">
									<Text className="font-JakartaSemiBold text-gray-700 mb-2">
										Week {new Date(week.week).toLocaleDateString()}
									</Text>
									<View className="flex-row flex-wrap gap-2">
										{Object.entries(week)
											.filter(([key]) => key !== 'week' && key !== 'total')
											.map(([muscle, volume]) => {
												const percentage =
													week.total > 0 ? ((volume / week.total) * 100).toFixed(1) : '0';
												return (
													<View
														key={muscle}
														className="px-2 py-1 rounded-full"
														style={{
															backgroundColor: `${MUSCLE_COLORS[muscle as keyof typeof MUSCLE_COLORS]}20`,
														}}
													>
														<Text className="text-xs font-JakartaSemiBold capitalize">
															{muscle}: {percentage}%
														</Text>
													</View>
												);
											})}
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Volume History */}
				{balanceData.volumeHistory.length > 0 && (
					<View className="p-6">
						<Text className="text-lg font-JakartaBold text-gray-800 mb-4">Recent Workouts</Text>

						<View className="bg-gray-50 rounded-xl p-4">
							{balanceData.volumeHistory.slice(0, 10).map((workout, index) => (
								<View
									key={index}
									className="mb-3 last:mb-0 pb-3 border-b border-gray-200 last:border-b-0"
								>
									<Text className="font-JakartaSemiBold text-gray-700 mb-2">
										{new Date(workout.workout_date).toLocaleDateString()}
									</Text>
									<View className="flex-row justify-between">
										<Text className="text-sm text-gray-600">
											Total Volume: {workout.total_volume}
										</Text>
										<View className="flex-row space-x-2">
											{Object.entries(workout)
												.filter(([key]) => key.includes('volume') && key !== 'total_volume')
												.map(([muscle, volume]) => {
													const muscleName = muscle.replace('_volume', '');
													return volume > 0 ? (
														<View
															key={muscle}
															className="px-2 py-1 rounded-full"
															style={{
																backgroundColor: `${MUSCLE_COLORS[muscleName as keyof typeof MUSCLE_COLORS]}20`,
															}}
														>
															<Text className="text-xs font-JakartaSemiBold capitalize">
																{muscleName}: {volume}
															</Text>
														</View>
													) : null;
												})}
										</View>
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Insights */}
				<View className="p-6">
					<Text className="text-lg font-JakartaBold text-gray-800 mb-4">Balance Insights</Text>

					<View className="bg-blue-50 rounded-xl p-4">
						<View className="flex-row items-center mb-3">
							<Ionicons name="bulb" size={20} color="#3B82F6" />
							<Text className="font-JakartaSemiBold text-blue-800 ml-2">AI Recommendations</Text>
						</View>
						<Text className="text-blue-700 text-sm leading-5">
							Based on your muscle balance, our AI will automatically adjust future workouts to
							ensure balanced development across all muscle groups. Keep completing workouts to see
							your balance improve over time.
						</Text>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
