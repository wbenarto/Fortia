import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import CustomButton from './CustomButton';

interface MacroData {
  date: string;
  protein: number;
  carbs: number;
  fats: number;
}

interface MacrosTrackingProps {
  dailyGoal: {
    protein: number;
    carbs: number;
    fats: number;
  };
  currentIntake: {
    protein: number;
    carbs: number;
    fats: number;
  };
  weeklyData: MacroData[];
  onAddMeal: () => void;
}

const MacroProgressBar = ({ current, goal, color, label }: { current: number; goal: number; color: string; label: string }) => {
  const percentage = Math.min((current / goal) * 100, 100);
  
  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1">
        <Text className="text-white font-JakartaSemiBold">{label}</Text>
        <Text className="text-white font-JakartaSemiBold">{current}g / {goal}g</Text>
      </View>
      <View className="h-2 bg-neutral-700 rounded-full overflow-hidden">
        <View 
          className={`h-full ${color} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
};

const MacrosTracking: React.FC<MacrosTrackingProps> = ({
  dailyGoal,
  currentIntake,
  weeklyData,
  onAddMeal,
}) => {
  const chartData = weeklyData.map((data, index) => ({
    value: data.protein + data.carbs + data.fats,
    dataPointText: `${data.protein + data.carbs + data.fats}g`,
    label: data.date,
  }));

  return (
    <ScrollView className="flex-1 ">
      <View className="">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-JakartaBold text-white">Macros Tracking</Text>
          <TouchableOpacity 
            onPress={onAddMeal}
            className="bg-cyan-600 px-4 py-2 rounded-full"
          >
            <Text className="text-white font-JakartaSemiBold">Add Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Progress */}
        <View className="bg-gray-600 p-4 rounded-2xl mb-6">
          <Text className="text-xl font-JakartaBold text-white mb-4">Today's Progress</Text>
          
          <MacroProgressBar
            current={currentIntake.protein}
            goal={dailyGoal.protein}
            color="bg-blue-500"
            label="Protein"
          />
          
          <MacroProgressBar
            current={currentIntake.carbs}
            goal={dailyGoal.carbs}
            color="bg-green-500"
            label="Carbs"
          />
          
          <MacroProgressBar
            current={currentIntake.fats}
            goal={dailyGoal.fats}
            color="bg-yellow-500"
            label="Fats"
          />

          <View className="mt-4 flex-row justify-between">
            <View className="items-center">
              <Text className="text-white font-JakartaSemiBold">
                {Math.round((currentIntake.protein + currentIntake.carbs + currentIntake.fats) / 
                (dailyGoal.protein + dailyGoal.carbs + dailyGoal.fats) * 100)}%
              </Text>
              <Text className="text-neutral-400 text-sm">Daily Goal</Text>
            </View>
            <View className="items-center">
              <Text className="text-white font-JakartaSemiBold">
                {currentIntake.protein + currentIntake.carbs + currentIntake.fats}g
              </Text>
              <Text className="text-neutral-400 text-sm">Total Intake</Text>
            </View>
          </View>
        </View>

        {/* Weekly Chart */}
        {/* <View className="bg-neutral-800 p-4 rounded-2xl">
          <Text className="text-xl font-JakartaBold text-white mb-4">Weekly Overview</Text>
          <LineChart
            data={chartData}
            height={200}
            width={300}
            spacing={40}
            initialSpacing={20}
            color="#494358"
            thickness={3}
            startFillColor="#494358"
            endFillColor="#494358"
            startOpacity={0.9}
            endOpacity={0.2}
            backgroundColor="transparent"
            xAxisColor="#494358"
            yAxisColor="#494358"
            yAxisTextStyle={{ color: '#fff' }}
            xAxisLabelTextStyle={{ color: '#fff' }}
            hideRules
            hideDataPoints
            curved
            dataPointsColor="#494358"
            dataPointsRadius={6}
            dataPointsWidth={3}
            dataPointsHeight={3}
            focusEnabled
            showStripOnFocus
            stripColor="#494358"
            stripWidth={2}
          />
        </View> */}
      </View>
    </ScrollView>
  );
};

export default MacrosTracking; 