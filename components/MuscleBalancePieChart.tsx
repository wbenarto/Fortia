import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

interface MuscleBalanceBarChartProps {
	muscleBalance: { [key: string]: number };
}

export default function MuscleBalanceBarChart({ muscleBalance }: MuscleBalanceBarChartProps) {
	// Get screen dimensions for responsive width
	const screenWidth = Dimensions.get('window').width;
	const chartWidth = Math.min(screenWidth - 80, 320); // Max 320px, with 40px padding on each side

	// Define colors for different muscle groups
	const muscleColors: { [key: string]: string } = {
		chest: '#FF6B6B',
		back: '#4ECDC4',
		legs: '#45B7D1',
		shoulders: '#96CEB4',
		arms: '#FFEAA7',
		core: '#DDA0DD',
		'upper body': '#FFB347',
		'lower body': '#87CEEB',
		'full body': '#98D8C8',
	};

	// Convert muscle balance data to bar chart format
	const barData = Object.entries(muscleBalance).map(([muscle, percentage]) => ({
		value: percentage as number,
		frontColor: muscleColors[muscle.toLowerCase()] || '#95A5A6',
		label: muscle.charAt(0).toUpperCase() + muscle.slice(1),
	}));

	return (
		<View className="items-center">
			<View className=" w-full">
				<BarChart
					data={barData}
					width={chartWidth}
					height={100}
					barWidth={Math.max(25, chartWidth / barData.length - 20)}
					spacing={Math.max(15, chartWidth / barData.length / 4)}
					roundedTop
					hideRules
					xAxisThickness={0}
					yAxisThickness={0}
					yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
					xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10, fontWeight: 'bold' }}
					noOfSections={2}
					maxValue={50}
					showValuesAsTopLabel
					topLabelTextStyle={{ color: '#374151', fontSize: 10 }}
				/>
			</View>
		</View>
	);
}
