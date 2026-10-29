import { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SCREEN_BG } from '@/lib/theme';

// Flat, swipe-to-delete row for the Activity screen — same shape as the food log's MealRow.
// Pass onToggleCompletion to make the leading icon a completion checkbox, and onPress to
// make the row open something (e.g. the built workout behind a logged activity).
const ActivityRow = ({
	title,
	subtitle,
	calories,
	icon,
	activityIcon,
	isLast,
	isCompleted = false,
	onToggleCompletion,
	onDelete,
	onPress,
	deleteLabel,
}: {
	title: string;
	subtitle?: string;
	calories?: number;
	icon: keyof typeof Ionicons.glyphMap;
	// Sport glyph from the activity catalogue (run, bike, swim…); overrides `icon`
	activityIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
	isLast: boolean;
	isCompleted?: boolean;
	onToggleCompletion?: () => void;
	onDelete: () => void;
	onPress?: () => void;
	deleteLabel: string;
}) => {
	const swipeRef = useRef<SwipeableMethods>(null);

	const confirmDelete = () => {
		Alert.alert('Delete', `Remove "${deleteLabel}" from today?`, [
			{ text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
			{ text: 'Delete', style: 'destructive', onPress: onDelete },
		]);
	};

	const leading = (
		<View
			className="w-9 h-9 rounded-full items-center justify-center"
			style={{ backgroundColor: isCompleted ? '#7DB88A26' : '#E3BBA126' }}
		>
			{activityIcon && !isCompleted ? (
				<MaterialCommunityIcons name={activityIcon} size={18} color="#cd9c99" />
			) : (
				<Ionicons
					name={isCompleted ? 'checkmark' : icon}
					size={18}
					color={isCompleted ? '#5f9a6c' : '#cd9c99'}
				/>
			)}
		</View>
	);

	return (
		<ReanimatedSwipeable
			ref={swipeRef}
			friction={2}
			rightThreshold={40}
			overshootRight={false}
			renderRightActions={() => (
				<TouchableOpacity
					onPress={confirmDelete}
					className="w-16 ml-2 rounded-2xl items-center justify-center"
					style={{ backgroundColor: '#E08585' }}
				>
					<Ionicons name="trash-outline" size={20} color="white" />
				</TouchableOpacity>
			)}
		>
			<TouchableOpacity
				activeOpacity={onPress ? 0.7 : 1}
				disabled={!onPress}
				onPress={onPress}
				className={`flex-row items-center py-3.5 ${isLast ? '' : 'border-b-[1px] border-[#F0EBE6]'}`}
				style={{ backgroundColor: SCREEN_BG }}
			>
				{onToggleCompletion ? (
					<TouchableOpacity
						onPress={onToggleCompletion}
						hitSlop={8}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: isCompleted }}
						accessibilityLabel={`Mark ${title} ${isCompleted ? 'not done' : 'done'}`}
					>
						{leading}
					</TouchableOpacity>
				) : (
					leading
				)}

				<View className="flex-1 ml-3 pr-3">
					<Text
						className="font-JakartaSemiBold text-[14px]"
						style={{
							color: isCompleted ? '#574F47' : '#262135',
							textDecorationLine: isCompleted ? 'line-through' : 'none',
						}}
						numberOfLines={1}
					>
						{title}
					</Text>
					{!!subtitle && (
						<Text
							className="font-JakartaMedium text-[11px] text-[#574F47] mt-0.5"
							numberOfLines={1}
						>
							{subtitle}
						</Text>
					)}
				</View>

				<Text className="font-JakartaBold text-[13px] text-[#262135]">
					{calories ? Math.round(calories).toLocaleString() : '--'}
					<Text className="font-JakartaMedium text-[11px] text-[#574F47]"> cal</Text>
				</Text>
				{onPress && (
					<Ionicons name="chevron-forward" size={14} color="#857869" style={{ marginLeft: 6 }} />
				)}
			</TouchableOpacity>
		</ReanimatedSwipeable>
	);
};

export default ActivityRow;
