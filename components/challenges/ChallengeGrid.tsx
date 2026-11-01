import { useState } from 'react';
import { View, Text, TouchableOpacity, type LayoutChangeEvent } from 'react-native';

import { LEVEL_COLORS, gridColumns, type ChallengeDay } from '@/lib/challenges';

// GitHub-style contribution grid: one column per week, rows Sunday → Saturday.
// Fill = how many targets were hit (LEVEL_COLORS); grey = nothing logged.
// Today is outlined in ink, upcoming days are hollow.

const GAP = 4;
const LABEL_WIDTH = 14;

// 'onDark' = white tints for the green hero card on Home
const PALETTES = {
	light: { levels: LEVEL_COLORS, today: '#262135', future: '#D9CFC4', label: '#574F47' },
	onDark: {
		levels: [
			'rgba(255,255,255,0.16)',
			'rgba(255,255,255,0.35)',
			'rgba(255,255,255,0.55)',
			'rgba(255,255,255,0.78)',
			'#FFFFFF',
		],
		today: '#FFD66B',
		future: 'rgba(255,255,255,0.3)',
		label: 'rgba(255,255,255,0.75)',
	},
} as const;

const ChallengeGrid = ({
	days,
	selected,
	onSelect,
	maxCell = 26,
	showWeekdays = true,
	palette = 'light',
}: {
	days: ChallengeDay[];
	selected?: string | null;
	onSelect?: (day: ChallengeDay) => void;
	maxCell?: number;
	showWeekdays?: boolean;
	palette?: keyof typeof PALETTES;
}) => {
	const colors = PALETTES[palette];
	const [width, setWidth] = useState(0);
	const columns = gridColumns(days);
	const labels = showWeekdays ? LABEL_WIDTH + GAP : 0;
	const cell =
		width > 0 && columns.length
			? Math.max(
					8,
					Math.min(
						maxCell,
						Math.floor((width - labels - GAP * (columns.length - 1)) / columns.length)
					)
				)
			: 0;

	return (
		<View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
			{cell > 0 && (
				<View className="flex-row">
					{showWeekdays && (
						<View style={{ width: LABEL_WIDTH, marginRight: GAP }}>
							{'SMTWTFS'.split('').map((letter, i) => (
								<Text
									key={i}
									style={{ height: cell, marginBottom: i < 6 ? GAP : 0, lineHeight: cell }}
									className="text-[9px] font-JakartaSemiBold text-[#574F47]"
								>
									{i % 2 === 1 ? letter : ''}
								</Text>
							))}
						</View>
					)}
					{columns.map((column, c) => (
						<View key={c} style={{ marginRight: c < columns.length - 1 ? GAP : 0 }}>
							{column.map((day, r) => {
								const style = {
									width: cell,
									height: cell,
									marginBottom: r < 6 ? GAP : 0,
									borderRadius: Math.max(2, cell / 5),
								};
								if (!day) return <View key={r} style={style} />;
								const future = day.state === 'future';
								const isSelected = selected === day.date;
								const box = (
									<View
										style={{
											...style,
											backgroundColor: future ? 'transparent' : colors.levels[day.level],
											borderWidth: future || day.state === 'today' || isSelected ? 1.5 : 0,
											borderColor: isSelected
												? colors.today
												: day.state === 'today'
													? colors.today
													: colors.future,
										}}
									/>
								);
								return onSelect && !future ? (
									<TouchableOpacity
										key={r}
										onPress={() => onSelect(day)}
										accessibilityLabel={`${day.date}, ${day.state}`}
									>
										{box}
									</TouchableOpacity>
								) : (
									<View key={r}>{box}</View>
								);
							})}
						</View>
					))}
				</View>
			)}
		</View>
	);
};

// Calendar layout for the Home card: 7 columns (Sun–Sat), one row per week, sized to
// fill the width so short challenges get big boxes. Long ones shrink to stay under
// `maxHeight` instead of making the card very tall.
export const ChallengeCalendar = ({
	days,
	palette = 'light',
	maxHeight = 290,
	selected,
	onSelect,
}: {
	days: ChallengeDay[];
	palette?: keyof typeof PALETTES;
	maxHeight?: number; // Infinity = always fill the width (challenge page scrolls)
	selected?: string | null;
	onSelect?: (day: ChallengeDay) => void;
}) => {
	const colors = PALETTES[palette];
	const [width, setWidth] = useState(0);
	const weeks = gridColumns(days); // each entry is one Sun–Sat week
	const gap = 5;
	const byWidth = Math.floor((width - gap * 6) / 7);
	const byHeight = Number.isFinite(maxHeight)
		? Math.floor((maxHeight - gap * (weeks.length - 1)) / Math.max(1, weeks.length))
		: Infinity;
	const cell = width > 0 ? Math.max(8, Math.min(byWidth, byHeight, 52)) : 0;
	const rowWidth = cell * 7 + gap * 6;

	return (
		<View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
			{cell > 0 && (
				<View style={{ width: rowWidth, alignSelf: 'center' }}>
					<View className="flex-row mb-1.5">
						{'SMTWTFS'.split('').map((letter, i) => (
							<Text
								key={i}
								style={{ width: cell, marginRight: i < 6 ? gap : 0, color: colors.label }}
								className="text-center text-[10px] font-JakartaSemiBold"
							>
								{letter}
							</Text>
						))}
					</View>
					{weeks.map((week, w) => (
						<View
							key={w}
							className="flex-row"
							style={{ marginBottom: w < weeks.length - 1 ? gap : 0 }}
						>
							{week.map((day, i) => {
								const style = {
									width: cell,
									height: cell,
									marginRight: i < 6 ? gap : 0,
									borderRadius: Math.max(3, cell / 4.5),
								};
								if (!day) return <View key={i} style={style} />;
								const future = day.state === 'future';
								const isSelected = selected === day.date;
								const box = (
									<View
										style={{
											...style,
											backgroundColor: future ? 'transparent' : colors.levels[day.level],
											borderWidth: future || day.state === 'today' || isSelected ? 1.5 : 0,
											borderColor:
												isSelected || day.state === 'today' ? colors.today : colors.future,
										}}
									/>
								);
								return onSelect && !future ? (
									<TouchableOpacity
										key={i}
										onPress={() => onSelect(day)}
										accessibilityLabel={`${day.date}, ${day.state}`}
									>
										{box}
									</TouchableOpacity>
								) : (
									<View key={i}>{box}</View>
								);
							})}
						</View>
					))}
				</View>
			)}
		</View>
	);
};

export const GridLegend = () => (
	<View className="flex-row items-center justify-between">
		<View className="flex-row items-center">
			<Text className="text-[10px] font-JakartaMedium text-[#574F47] mr-1.5">Fewer targets</Text>
			{LEVEL_COLORS.map(color => (
				<View
					key={color}
					className="w-3 h-3 rounded-[3px] mr-1"
					style={{ backgroundColor: color }}
				/>
			))}
			<Text className="text-[10px] font-JakartaMedium text-[#574F47] ml-0.5">All 4</Text>
		</View>
	</View>
);

export default ChallengeGrid;
