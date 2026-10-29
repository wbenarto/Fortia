import { Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Home section title that opens its history in Progress ("Nutrition" → Nutrition tab).
const SectionTitle = ({
	title,
	tab,
	className = 'mb-5',
}: {
	title: string;
	tab: 'nutrition' | 'weight' | 'activity';
	className?: string;
}) => (
	<TouchableOpacity
		onPress={() => router.push({ pathname: '/progress', params: { tab } })}
		activeOpacity={0.6}
		hitSlop={8}
		className={`flex-row items-center self-start ${className}`}
		accessibilityRole="button"
		accessibilityLabel={`${title} history`}
	>
		<Text className="font-JakartaBold text-[18px] text-[#262135]">{title}</Text>
		<Ionicons name="chevron-forward" size={16} color="#857869" style={{ marginLeft: 4 }} />
	</TouchableOpacity>
);

export default SectionTitle;
