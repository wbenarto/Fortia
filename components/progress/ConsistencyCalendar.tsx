import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTodayDate } from '@/lib/dateUtils';
import { formatWeight, useUnitSystem } from '@/lib/units';
import {
	DOT_COLORS,
	addDays,
	shortDate,
	weekday,
	type ProgressDay,
	type Insight,
	TONE_STYLE,
	formatInsight,
} from '@/lib/progress';

const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

export const Dots = ({
	logged,
	size = 5,
	onAccent = false,
}: {
	logged: ProgressDay['logged'];
	size?: number;
	onAccent?: boolean; // on an accent-filled chip: white dots, faded when not logged
}) => (
	<View className="flex-row" style={{ columnGap: 2 }}>
		{(['meal', 'weight', 'exercise'] as const).map(key => (
			<View
				key={key}
				style={{
					width: size,
					height: size,
					borderRadius: size / 2,
					backgroundColor: onAccent
						? logged[key]
							? '#FFFFFF'
							: '#FFFFFF66'
						: logged[key]
							? DOT_COLORS[key]
							: '#E8E2DB',
				}}
			/>
		))}
	</View>
);

export const DotLegend = () => (
	<View className="flex-row" style={{ columnGap: 12 }}>
		{(
			[
				['meal', 'Meals'],
				['weight', 'Weight'],
				['exercise', 'Workout'],
			] as const
		).map(([key, label]) => (
			<View key={key} className="flex-row items-center">
				<View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: DOT_COLORS[key] }} />
				<Text className="text-[11px] font-JakartaMedium text-[#574F47]">{label}</Text>
			</View>
		))}
	</View>
);

// Grid of days (Sunday-first), 3 dots per day: meal / weight / workout logged.
// Tap a day to see its numbers. `through` pads the grid with the days still to come
// (e.g. the rest of this week), shown faded.
export const ConsistencyCalendar = ({
	days,
	through,
}: {
	days: ProgressDay[];
	through?: string;
}) => {
	const unitSystem = useUnitSystem();
	const today = getTodayDate();
	const [selected, setSelected] = useState<string | null>(null);
	const lead = days.length ? weekday(days[0].date) : 0;
	const upcoming: string[] = [];
	if (through && days.length) {
		for (let d = addDays(days[days.length - 1].date, 1); d <= through; d = addDays(d, 1)) {
			upcoming.push(d);
		}
	}
	const cells: (ProgressDay | string | null)[] = [...Array(lead).fill(null), ...days, ...upcoming];
	while (cells.length % 7) cells.push(null);
	const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
	const picked = days.find(d => d.date === selected);

	return (
		<View>
			<View className="flex-row mb-1">
				{'SMTWTFS'.split('').map((letter, i) => (
					<Text
						key={i}
						style={{ flex: 1 }}
						className="text-center text-[10px] font-JakartaSemiBold text-[#574F47]"
					>
						{letter}
					</Text>
				))}
			</View>
			{rows.map((row, r) => (
				<View key={r} className="flex-row">
					{row.map((day, c) => (
						<View key={c} style={{ flex: 1 }} className="items-center py-1">
							{typeof day === 'string' ? (
								<View className="items-center py-1 w-10" style={{ opacity: 0.4 }}>
									<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-1">
										{Number(day.slice(8, 10))}
									</Text>
									<Dots logged={{ meal: false, weight: false, exercise: false }} />
								</View>
							) : day ? (
								<TouchableOpacity
									onPress={() => setSelected(day.date === selected ? null : day.date)}
									className="items-center rounded-xl py-1 w-10"
									style={{
										borderWidth: day.date === today || day.date === selected ? 1 : 0,
										borderColor: day.date === selected ? '#262135' : '#E3BBA1',
										backgroundColor:
											day.logged.meal && day.logged.weight && day.logged.exercise
												? '#7DB88A14'
												: 'transparent',
									}}
								>
									<Text className="text-[11px] font-JakartaSemiBold text-[#262135] mb-1">
										{Number(day.date.slice(8, 10))}
									</Text>
									<Dots logged={day.logged} />
								</TouchableOpacity>
							) : null}
						</View>
					))}
				</View>
			))}

			{picked && (
				<View className="mt-3 rounded-2xl bg-[#F9F9F8] border-[1px] border-[#F0EBE6] px-4 py-3">
					<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
						{shortDate(picked.date)}
					</Text>
					<View className="flex-row justify-between mt-1.5">
						<DayStat
							label="Eaten"
							value={picked.logged.meal ? `${Math.round(picked.calories)} cal` : '—'}
						/>
						<DayStat
							label="Weight"
							value={picked.weight != null ? formatWeight(picked.weight, unitSystem) : '—'}
						/>
						<DayStat
							label="Workout"
							value={
								picked.trained
									? picked.workoutMinutes
										? `${picked.workoutMinutes} min`
										: 'Yes'
									: '—'
							}
						/>
						<DayStat
							label="Burned"
							value={picked.activeCalories ? `${picked.activeCalories} cal` : '—'}
						/>
					</View>
				</View>
			)}
		</View>
	);
};

const DayStat = ({ label, value }: { label: string; value: string }) => (
	<View>
		<Text className="text-[10px] font-JakartaMedium text-[#574F47]">{label}</Text>
		<Text className="text-[13px] font-JakartaBold text-[#262135] mt-0.5">{value}</Text>
	</View>
);

export const InsightList = ({ insights }: { insights: Insight[] }) => {
	const unitSystem = useUnitSystem();
	return (
		<View style={{ rowGap: 8 }}>
			{insights.map(insight => {
				const tone = TONE_STYLE[insight.tone];
				return (
					<View
						key={insight.id}
						className="flex-row items-center bg-white rounded-2xl border-[1px] border-[#F0EBE6] px-3.5 py-3"
					>
						<View
							className="w-8 h-8 rounded-full items-center justify-center"
							style={{ backgroundColor: tone.bg }}
						>
							<Ionicons
								name={insight.icon as keyof typeof Ionicons.glyphMap}
								size={16}
								color={tone.color}
							/>
						</View>
						<Text className="flex-1 ml-3 text-[13px] leading-5 font-JakartaMedium text-[#262135]">
							{formatInsight(insight, unitSystem)}
						</Text>
					</View>
				);
			})}
		</View>
	);
};
