import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const Navbar = () => {
	const insets = useSafeAreaInsets();

	return (
		<View className="left-0 right-0 bg-white z-50">
			<View className="items-center flex flex-row justify-between px-6">
				<View className="flex flex-row items-center">
					<View className="w-12 h-12 bg-[#E3BBA1] rounded-2xl flex justify-center items-center">
						<Text className="text-white ">WB</Text>
					</View>
					<Text className="ml-2 font-JakartaSemibold">Hi, William</Text>
				</View>

				<View>
					<Text>
						<View>
							<Ionicons name="settings-outline" size={24} color="black" />
						</View>
					</Text>
				</View>
			</View>
		</View>
	);
};

export default Navbar;
