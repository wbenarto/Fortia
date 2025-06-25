import { View, Text } from 'react-native';

const Food = ({ food }: { food: any }) => {
	return (
		<View className="w-full h-24 my-2 py-4 px-3 rounded-xl border-solid border-[1px] border-[#F1F5F9] ">
			<View className="flex flex-row justify-between items-center">
				<Text className="font-JakartaSemiBold">{food.name}</Text>
				<Text className="text-xs text-[#64748B]">{food.time}</Text>
			</View>
			<Text className="text-xs my-1 text-[#64748B]">{food.weight}g</Text>
			<View className="flex flex-row justify-between items-center">
				<Text className="text-[#64748B]">{food.calories} cal</Text>
				<Text className="text-[#64748B]">{food.protein}g protein</Text>
				<Text className="text-[#64748B]">{food.carbs}g carbs</Text>
				<Text className="text-[#64748B]">{food.fats}g fats</Text>
			</View>
		</View>
	);
};

export default Food;
