import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { formatSeconds } from '@/lib/workoutBuilder';

// Floating rest countdown shown after a set is checked off. The parent owns the clock
// (one interval for the whole player) and passes the remaining seconds in.
const RestTimer = ({
	remaining,
	total,
	nextLabel,
	onAdd,
	onSkip,
	bottomInset,
}: {
	remaining: number;
	total: number;
	nextLabel: string;
	onAdd: () => void;
	onSkip: () => void;
	bottomInset: number;
}) => {
	const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			exiting={FadeOutDown.duration(180)}
			className="absolute left-0 right-0 bottom-0 px-5"
			style={{ paddingBottom: 16 + bottomInset }}
		>
			<View
				className="bg-[#262135] rounded-3xl p-5"
				style={{
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 8 },
					shadowOpacity: 0.2,
					shadowRadius: 16,
					elevation: 8,
				}}
			>
				<View className="flex-row items-center justify-between">
					<View>
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#E3BBA1]"
							style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
						>
							Rest
						</Text>
						<Text className="font-JakartaExtraBold text-[36px] text-white">
							{remaining >= 60 ? formatSeconds(remaining) : `${remaining}s`}
						</Text>
					</View>
					<View className="flex-row" style={{ columnGap: 8 }}>
						<TouchableOpacity onPress={onAdd} className="bg-white/10 rounded-xl px-4 py-2.5">
							<Text className="text-white font-JakartaSemiBold">+15s</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={onSkip} className="bg-[#E3BBA1] rounded-xl px-4 py-2.5">
							<Text className="text-white font-JakartaSemiBold">Skip</Text>
						</TouchableOpacity>
					</View>
				</View>
				<View className="h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden">
					<View className="h-full rounded-full bg-[#E3BBA1]" style={{ width: `${pct * 100}%` }} />
				</View>
				<Text className="text-xs font-JakartaMedium text-white/60 mt-2" numberOfLines={1}>
					Next: {nextLabel}
				</Text>
			</View>
		</Animated.View>
	);
};

export default RestTimer;
