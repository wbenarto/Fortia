import { useRef, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	LayoutChangeEvent,
	Dimensions,
} from 'react-native';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';
import type { ProgressDay } from '@/lib/progress';
import { Dots } from '@/components/progress/ConsistencyCalendar';

interface WeeklyCalendarProps {
	selectedDate?: string;
	onSelectDate?: (date: string) => void;
	// What was logged per day (meal / weight / workout) — shown as 3 dots under each date
	logged?: Record<string, ProgressDay['logged']>;
	// Called with the visible week (Sunday → Saturday) after a swipe
	onWeekChange?: (from: string, to: string) => void;
}

const PAST_WEEKS = 52;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfWeek = (source: Date) => {
	const date = new Date(source);
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - date.getDay());
	return date;
};

const NOTHING_LOGGED = { meal: false, weight: false, exercise: false };

const WeeklyCalendar = ({
	selectedDate,
	onSelectDate,
	logged,
	onWeekChange,
}: WeeklyCalendarProps) => {
	const today = getTodayDate();
	const activeDate = selectedDate ?? today;
	const scrollRef = useRef<ScrollView>(null);
	const didSnapToCurrent = useRef(false);
	const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);

	const thisWeekStart = startOfWeek(new Date());
	const weeks = Array.from({ length: PAST_WEEKS + 1 }, (_, weekIndex) => {
		const weekStart = new Date(thisWeekStart);
		weekStart.setDate(weekStart.getDate() - (PAST_WEEKS - weekIndex) * 7);

		return Array.from({ length: 7 }, (_, dayIndex) => {
			const date = new Date(weekStart);
			date.setDate(weekStart.getDate() + dayIndex);
			const iso = getLocalDate(date);
			return {
				iso,
				date: date.getDate(),
				isToday: iso === today,
				isFuture: iso > today,
				isSelected: iso === activeDate,
			};
		});
	});

	const handleLayout = (event: LayoutChangeEvent) => {
		const width = event.nativeEvent.layout.width;
		if (width <= 0) return;
		setPageWidth(width);
		if (!didSnapToCurrent.current) {
			didSnapToCurrent.current = true;
			requestAnimationFrame(() => {
				scrollRef.current?.scrollTo({ x: PAST_WEEKS * width, animated: false });
			});
		}
	};

	return (
		<ScrollView
			ref={scrollRef}
			horizontal
			pagingEnabled
			decelerationRate="fast"
			showsHorizontalScrollIndicator={false}
			onLayout={handleLayout}
			onMomentumScrollEnd={e => {
				const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
				const week = weeks[Math.max(0, Math.min(weeks.length - 1, index))];
				onWeekChange?.(week[0].iso, week[6].iso);
			}}
			className="py-1"
		>
			{weeks.map((week, weekIndex) => (
				<View
					key={week[0].iso}
					style={{ width: pageWidth }}
					className="flex-row justify-between items-center px-4"
				>
					{week.map((item, index) => {
						const showToday = item.isToday && !item.isSelected;
						const cell = (
							<View
								className="w-11 items-center rounded-2xl py-2"
								style={{
									backgroundColor: item.isSelected ? '#E3BBA1' : 'transparent',
									opacity: item.isFuture ? 0.35 : 1,
									// With dots below, today is outlined instead of marked
									borderWidth: logged && showToday ? 1 : 0,
									borderColor: '#E3BBA1',
								}}
							>
								<Text
									className="text-[10px] font-JakartaSemiBold"
									style={{
										color: item.isSelected ? '#FFFFFF' : '#574F47',
										textTransform: 'uppercase',
										letterSpacing: 0.6,
									}}
								>
									{DAYS[index]}
								</Text>
								<Text
									className="text-[15px] font-JakartaBold mt-1"
									style={{ color: item.isSelected ? '#FFFFFF' : '#262135' }}
								>
									{item.date}
								</Text>
								{logged ? (
									<View className="mt-1.5" style={{ opacity: item.isFuture ? 0 : 1 }}>
										<Dots logged={logged[item.iso] || NOTHING_LOGGED} onAccent={item.isSelected} />
									</View>
								) : (
									// Today marker, hidden when today is the selected (filled) chip
									<View
										className="w-1 h-1 rounded-full mt-1"
										style={{ backgroundColor: showToday ? '#E3BBA1' : 'transparent' }}
									/>
								)}
							</View>
						);

						if (!onSelectDate || item.isFuture) {
							return (
								<View key={item.iso} pointerEvents={item.isFuture ? 'none' : 'auto'}>
									{cell}
								</View>
							);
						}

						return (
							<TouchableOpacity
								key={item.iso}
								onPress={() => onSelectDate(item.iso)}
								activeOpacity={0.7}
							>
								{cell}
							</TouchableOpacity>
						);
					})}
				</View>
			))}
		</ScrollView>
	);
};

export default WeeklyCalendar;
