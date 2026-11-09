import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReactNativeModal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';
import { addDays, diffDays } from '@/lib/progress';

// Noon so the picker never shifts the day across time zones
const toPickerDate = (iso: string) => new Date(`${iso}T12:00:00`);

const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

// "Today · Sat, Nov 8", "Yesterday · Fri, Nov 7", or just "Wed, Nov 5"
const eyebrowLabel = (iso: string) => {
	const full = toPickerDate(iso).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
	const ago = diffDays(iso, getTodayDate());
	return ago === 0 ? `Today · ${full}` : ago === 1 ? `Yesterday · ${full}` : full;
};

// Subtle day switcher for the Home header: ‹ date › — tap the date for a calendar.
// Never goes past today.
const DateNavigator = ({ date, onChange }: { date: string; onChange: (date: string) => void }) => {
	const insets = useSafeAreaInsets();
	const [calendarOpen, setCalendarOpen] = useState(false);
	const today = getTodayDate();
	const atToday = date >= today;

	const go = (next: string) => {
		Haptics.selectionAsync().catch(() => {});
		onChange(next > today ? today : next);
	};

	return (
		<>
			{/* Same small eyebrow as before ("Today · Sat, Nov 8"), with carets and a tappable date */}
			<View className="flex-row items-center">
				<TouchableOpacity
					onPress={() => go(addDays(date, -1))}
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
					accessibilityLabel="Previous day"
				>
					<Ionicons name="chevron-back" size={14} color="#574F47" />
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => setCalendarOpen(true)}
					hitSlop={{ top: 10, bottom: 10 }}
					className="mx-1.5"
					accessibilityRole="button"
					accessibilityLabel={`${eyebrowLabel(date)}. Open calendar`}
				>
					<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
						{eyebrowLabel(date)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => go(addDays(date, 1))}
					disabled={atToday}
					hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
					style={{ opacity: atToday ? 0.3 : 1 }}
					accessibilityLabel="Next day"
				>
					<Ionicons name="chevron-forward" size={14} color="#574F47" />
				</TouchableOpacity>
			</View>

			<ReactNativeModal
				isVisible={calendarOpen}
				onBackdropPress={() => setCalendarOpen(false)}
				onBackButtonPress={() => setCalendarOpen(false)}
				style={{ margin: 0, justifyContent: 'flex-end' }}
			>
				<View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: 24 + insets.bottom }}>
					<View className="flex-row items-center justify-between mb-2">
						<Text className="text-xl font-JakartaExtraBold text-[#262135]">Pick a day</Text>
						<TouchableOpacity onPress={() => setCalendarOpen(false)} accessibilityLabel="Close">
							<Ionicons name="close" size={24} color="#334155" />
						</TouchableOpacity>
					</View>
					<DateTimePicker
						value={toPickerDate(date)}
						mode="date"
						display="inline"
						maximumDate={toPickerDate(today)}
						accentColor="#D4A07E"
						onChange={(_, picked) => {
							if (!picked) return;
							go(getLocalDate(picked));
							setCalendarOpen(false);
						}}
					/>
					{!atToday && (
						<TouchableOpacity
							onPress={() => {
								go(today);
								setCalendarOpen(false);
							}}
							className="bg-[#F1F1F1] rounded-xl py-3 mt-2"
						>
							<Text className="text-center font-JakartaSemiBold text-[15px] text-[#262135]">
								Back to today
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</ReactNativeModal>
		</>
	);
};

export default DateNavigator;
