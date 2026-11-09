import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// One macro column: label, "eaten / goal g" and a thick bar in the macro's colour
// (MACRO_COLORS in lib/theme.ts). Shared by Home (MacrosTracking) and the Food log
// (FoodLogCard) so both look the same. Over target, the numbers turn red.

const OVER_COLOR = '#E5484D';

const barFillPct = (eaten: number, goal?: number) => {
	if (!goal) return 0;
	return Math.min(100, Math.round((eaten / goal) * 100));
};

const MacroBar = ({
	label,
	color,
	eaten,
	goal,
	isLoading = false,
	onPress,
}: {
	onPress?: () => void; // e.g. open the meal guide for this macro
	label: string;
	color: string;
	eaten: number;
	goal?: number; // no goal: shows just the grams and an empty track
	isLoading?: boolean;
}) => {
	const isOver = !isLoading && !!goal && eaten > goal;
	return (
		<TouchableOpacity
			className="flex-1 justify-between"
			activeOpacity={0.7}
			onPress={onPress}
			disabled={!onPress}
			accessibilityRole={onPress ? 'button' : undefined}
			accessibilityLabel={
				onPress ? `${label}, ${Math.round(eaten)} grams. See foods that fit` : undefined
			}
		>
			<View className="flex-row items-center">
				<Text
					className="text-[10px] font-JakartaSemiBold text-[#574F47]"
					style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
					numberOfLines={1}
				>
					{label}
				</Text>
				{onPress && (
					<Ionicons name="chevron-forward" size={10} color="#857869" style={{ marginLeft: 2 }} />
				)}
			</View>
			<Text
				className="font-JakartaBold text-[15px] mt-1"
				style={{ color: isOver ? OVER_COLOR : '#262135' }}
				numberOfLines={1}
				adjustsFontSizeToFit
				minimumFontScale={0.8}
			>
				{isLoading ? '...' : Math.round(eaten)}
				<Text
					className="font-JakartaMedium text-[11px]"
					style={{ color: isOver ? OVER_COLOR : '#574F47' }}
				>
					{isLoading ? '' : goal ? ` / ${goal}g` : 'g'}
				</Text>
			</Text>
			<View
				className="w-full h-[10px] rounded-full overflow-hidden mt-2"
				style={{ backgroundColor: `${color}2E` }}
			>
				<View
					className="h-full rounded-full"
					style={{ width: `${barFillPct(eaten, goal)}%`, backgroundColor: color }}
				/>
			</View>
		</TouchableOpacity>
	);
};

export default MacroBar;
