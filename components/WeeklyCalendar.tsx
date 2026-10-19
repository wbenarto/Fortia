import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, LayoutChangeEvent, Dimensions } from 'react-native';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';

interface WeeklyCalendarProps {
	selectedDate?: string;
	onSelectDate?: (date: string) => void;
}

const PAST_WEEKS = 52;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfWeek = (source: Date) => {
	const date = new Date(source);
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - date.getDay());
	return date;
};

const WeeklyCalendar = ({ selectedDate, onSelectDate }: WeeklyCalendarProps) => {
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
			className="py-1"
		>
			{weeks.map((week, weekIndex) => (
				<View
					key={week[0].iso}
					style={{ width: pageWidth }}
					className="flex-row justify-between items-center px-4"
				>
					{week.map((item, index) => {
						const cell = (
							<View
								className="w-11 items-center rounded-2xl py-2"
								style={{
									backgroundColor: item.isSelected ? '#E3BBA1' : 'transparent',
									opacity: item.isFuture ? 0.35 : 1,
								}}
							>
								<Text
									className="text-[10px] font-JakartaSemiBold"
									style={{
										color: item.isSelected ? '#FFFFFF' : '#94897E',
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
								{/* Today marker, hidden when today is the selected (filled) chip */}
								<View
									className="w-1 h-1 rounded-full mt-1"
									style={{
										backgroundColor: item.isToday && !item.isSelected ? '#E3BBA1' : 'transparent',
									}}
								/>
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
