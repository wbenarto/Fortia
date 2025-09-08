import { View, Text } from 'react-native';

interface MiniDashboardTrackingProps {
	totalMealsLog: number;
	totalWeightsLog: number;
	totalExercisesLog: number;
}

const MiniDashboardTracking: React.FC<MiniDashboardTrackingProps> = () => {
	return (
		<View className="w-full h-20 mt-2 flex flex-row px-10 space-x-4 justify-center items-center">
			<View className="w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm  h-full flex justify-center items-center">
				<Text className="font-JakartaSemiBold text-lg mb-1">53</Text>
				<Text className="text-secondary-600 font-Jakarta text-[10px] leading-tight">
					Weights Logged
				</Text>
			</View>
			<View className="bg-red-100 w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm  rounded-xl h-full flex justify-center items-center ">
				<Text className="font-JakartaSemiBold text-lg mb-1">48</Text>
				<Text className="text-secondary-600 font-Jakarta text-[10px] leading-tight">
					Meals Logged
				</Text>
			</View>
			<View className="bg-red-100 w-1/3 bg-white rounded-2xl border border-[#F5F2F0] shadow-sm  rounded-xl h-full flex justify-center items-center ">
				<Text className="font-JakartaSemiBold text-lg mb-1">123</Text>
				<Text className="text-secondary-600 font-Jakarta text-[10px] leading-tight">
					Exercises Logged
				</Text>
			</View>
		</View>
	);
};

export default MiniDashboardTracking;
