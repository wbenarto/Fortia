import { Stack } from 'expo-router';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfile, getUserDisplayName, getUserInitials } from '@/lib/userUtils';
import { router } from 'expo-router';
import { SCREEN_BG } from '@/lib/theme';

const capitalize = (value: string) =>
	value.length ? value[0].toUpperCase() + value.slice(1) : value;

const Navbar = () => {
	const userProfile = useUserProfile();
	const insets = useSafeAreaInsets();

	const navigateToProfile = () => {
		router.push('/account-settings');
	};

	return (
		<View className="left-0 right-0 z-50" style={{ backgroundColor: SCREEN_BG }}>
			<View className="items-center flex flex-row justify-between px-6">
				<View className="flex flex-row items-center">
					<View className="w-12 h-12 bg-[#E3BBA1] rounded-2xl flex justify-center items-center">
						<Text className="text-white font-JakartaSemibold">{getUserInitials(userProfile)}</Text>
					</View>
					<Text className="ml-2 font-JakartaSemibold">
						Hi, {capitalize(getUserDisplayName(userProfile))}
					</Text>
				</View>

				<TouchableOpacity onPress={navigateToProfile} className="p-2 rounded-lg active:bg-gray-100">
					<Ionicons name="settings-outline" size={24} color="black" />
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default Navbar;
