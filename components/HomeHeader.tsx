import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import DateNavigator from '@/components/DateNavigator';
import { useUserProfile, getUserDisplayName, getUserInitials } from '@/lib/userUtils';

const capitalize = (value: string) =>
	value.length ? value[0].toUpperCase() + value.slice(1) : value;

// Day eyebrow (‹ Today · date ›, tap for a calendar) over the greeting, plus the avatar
// (Account settings).
const HomeHeader = ({
	date,
	onDateChange,
}: {
	date: string;
	onDateChange: (date: string) => void;
}) => {
	const userProfile = useUserProfile();

	return (
		<View className="flex-row items-center justify-between px-6 pt-6">
			<View className="flex-1 pr-4">
				<DateNavigator date={date} onChange={onDateChange} />
				<Text className="font-JakartaBold text-[22px] text-[#262135] mt-1" numberOfLines={1}>
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
					<Text className="font-JakartaBold text-[16px] text-white">
						{getUserInitials(userProfile)}
					</Text>
				</View>
			</TouchableOpacity>
		</View>
	);
};

export default HomeHeader;
