import { View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from './CustomButton';

const SuggestedMeals = () => {
	return (
		<View className="w-full h-full">
			<View className="p-4 mx-4 border-[1px] border-[#F1F5F9] border-solid rounded-2xl ">
				<View className="flex flex-row items-center gap-2">
					<Ionicons name="sparkles-outline" size={24} color="#E3BBA1" />
					<Text className="text-lg font-JakartaSemiBold">Suggested Meals</Text>
					<View className="bg-[#E3BBA1] rounded-full px-3 py-1">
						<Text className="text-xs text-white font-JakartaSemiBold">PREMIUM</Text>
					</View>
				</View>
				<View className="flex flex-row items-center gap-2 my-1">
					<Text className="text-sm text-[#64748B]">
						To complete your daily goals, you need: 1027 cal, 131g carbs, 24g protein, 24g fat
					</Text>
				</View>
				<BlurView
					intensity={20}
					tint="light"
					className="w-full h-60 rounded-2xl my-2 overflow-hidden"
				>
					<View className="flex items-center p-4 h-full">
						<View className="flex w-16 h-16 bg-[#E3BBA1] rounded-full items-center justify-center">
							<Ionicons name="lock-closed-outline" size={30} color="white" />
						</View>
						<Text className=" my-2 text-base font-JakartaMedium text-center">
							Unlock Smart Meal Suggestions
						</Text>
						<Text className="text-sm text-[#64748B] text-center">
							Get personalized meal suggestions based on your remaining macros and preferences.
						</Text>
						<CustomButton
							title="Upgrade to Premium"
							className="rounded-full px-6 py-3"
							onPress={() => {
								console.log('Upgrade');
							}}
						/>
					</View>
				</BlurView>
			</View>
		</View>
	);
};

export default SuggestedMeals;
