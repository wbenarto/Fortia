import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useUserProfile, getUserDisplayName, getUserInitials } from '@/lib/userUtils';

const capitalize = (value: string) =>
	value.length ? value[0].toUpperCase() + value.slice(1) : value;

const greetingForHour = (hour: number) =>
	hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

// Replaces Navbar on Home: scrolls with the page instead of sticking, and folds the
// settings entry point into the avatar.
const HomeHeader = () => {
	const userProfile = useUserProfile();
	const now = new Date();

	return (
		<View className="flex-row items-center justify-between px-6 pt-6">
			<View className="flex-1 pr-4">
				<Text
					className="text-[11px] font-JakartaSemiBold text-[#94897E]"
					style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
				>
					{greetingForHour(now.getHours())}
				</Text>
				<Text className="font-JakartaBold text-[28px] text-[#262135] mt-1" numberOfLines={1}>
					Hi, {capitalize(getUserDisplayName(userProfile))}
				</Text>
			</View>

			<TouchableOpacity
				onPress={() => router.push('/account-settings')}
				activeOpacity={0.8}
				accessibilityRole="button"
				accessibilityLabel="Account settings"
			>
				<View className="w-12 h-12 rounded-full bg-[#E3BBA1] items-center justify-center">
					<Text className="font-JakartaBold text-[16px] text-white">{getUserInitials(userProfile)}</Text>
				</View>
			</TouchableOpacity>
		</View>
	);
};

export default HomeHeader;
