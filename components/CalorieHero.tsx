import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
	Easing,
	useAnimatedProps,
	useSharedValue,
	withTiming,
	type SharedValue,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 128;
const STROKE = 11;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3; // px of track left between sections, like the Food log bar

const eyebrowStyle = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

export interface RingSection {
	key: string;
	label: string;
	value: number;
	color: string;
}

// Same status colours as the Food log bar
const statusColor = (pctOfGoal: number) =>
	pctOfGoal > 100 ? '#E08585' : pctOfGoal >= 90 ? '#F2D58E' : '#7DB88A';

// One section of a ring: an arc from `start` to `start + length` (px along the ring),
// drawn in as `progress` goes 0 → 1
const RingArc = ({
	start,
	length,
	color,
	progress,
}: {
	start: number;
	length: number;
	color: string;
	progress: SharedValue<number>;
}) => {
	const animatedProps = useAnimatedProps(() => {
		const shown = Math.max(0, Math.min(length, progress.value * (start + length) - start));
		return {
			strokeDasharray: `${shown} ${CIRCUMFERENCE}`,
			strokeOpacity: shown > 0.5 ? 1 : 0,
		};
	});
	return (
		<AnimatedCircle
			cx={RING_SIZE / 2}
			cy={RING_SIZE / 2}
			r={RADIUS}
			stroke={color}
			strokeWidth={STROKE}
			strokeLinecap="butt"
			fill="none"
			strokeDashoffset={-start}
			transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
			animatedProps={animatedProps}
		/>
	);
};

// Ring split into sections. Full circle = the larger of target and total, so going over
// stays visible; a small tick marks the target then.
const SectionRing = ({
	label,
	icon,
	total,
	target,
	sections,
	isLoading,
	trackColor,
	onPress,
}: {
	onPress?: () => void;
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	total: number;
	target: number;
	sections: RingSection[];
	isLoading: boolean;
	trackColor: string;
}) => {
	const progress = useSharedValue(0);
	const scale = Math.max(target, total) || 1;
	const shown = sections.filter(s => s.value > 0);

	useEffect(() => {
		if (isLoading) return;
		progress.value = 0;
		progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
	}, [isLoading, total, target]);

	let cursor = 0;
	const arcs = shown.map((section, i) => {
		const full = (section.value / scale) * CIRCUMFERENCE;
		const gap = shown.length > 1 && i < shown.length - 1 ? GAP : 0;
		const arc = { ...section, start: cursor, length: Math.max(0, full - gap) };
		cursor += full;
		return arc;
	});

	const overTarget = target > 0 && total > target;
	const tickAngle = (target / scale) * 360 - 90;
	const tickRad = (tickAngle * Math.PI) / 180;

	return (
		<TouchableOpacity
			activeOpacity={0.75}
			onPress={onPress}
			disabled={!onPress}
			className="items-center flex-1"
			accessibilityRole="button"
			accessibilityLabel={`${label} ${Math.round(total)} calories. Open details`}
		>
			<View style={{ width: RING_SIZE, height: RING_SIZE }}>
				<Svg width={RING_SIZE} height={RING_SIZE}>
					<Circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RADIUS}
						stroke={trackColor}
						strokeWidth={STROKE}
						fill="none"
					/>
					{!isLoading &&
						arcs.map(arc => (
							<RingArc
								key={arc.key}
								start={arc.start}
								length={arc.length}
								color={arc.color}
								progress={progress}
							/>
						))}
					{!isLoading && overTarget && (
						<Circle
							cx={RING_SIZE / 2 + RADIUS * Math.cos(tickRad)}
							cy={RING_SIZE / 2 + RADIUS * Math.sin(tickRad)}
							r={3.5}
							fill="#262135"
							stroke="#FFFFFF"
							strokeWidth={1.5}
						/>
					)}
				</Svg>
				<View style={StyleSheet.absoluteFill} className="items-center justify-center">
					<Ionicons name={icon} size={15} color="#D4A07E" />
					<Text className="font-JakartaExtraBold text-[26px] text-[#262135]" numberOfLines={1}>
						{isLoading ? '...' : Math.round(total).toLocaleString()}
					</Text>
					<Text className="text-[12px] font-JakartaBold text-[#574F47]" style={eyebrowStyle}>
						{label}
					</Text>
				</View>
			</View>

			{/* Target */}
			<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-2">
				of{' '}
				<Text className="font-JakartaBold text-[#262135]">
					{target > 0 ? Math.round(target).toLocaleString() : '–'}
				</Text>{' '}
				cal
			</Text>
		</TouchableOpacity>
	);
};

// Calorie balance: burned − eaten, as a sentence with direction and a short hint
const BalanceCard = ({
	eaten,
	burned,
	isLoading,
}: {
	eaten: number;
	burned: number;
	isLoading: boolean;
}) => {
	const net = Math.round(burned - eaten);
	const kind = Math.abs(net) < 25 ? 'balanced' : net > 0 ? 'deficit' : 'surplus';
	const theme = {
		deficit: {
			color: '#7DB88A',
			text: '#3F7A4E',
			icon: 'trending-down' as const,
			title: `${Math.abs(net).toLocaleString()} cal deficit`,
			hint: 'Burning more than you eat',
		},
		surplus: {
			color: '#E3BBA1',
			text: '#9A5B3F',
			icon: 'trending-up' as const,
			title: `${Math.abs(net).toLocaleString()} cal surplus`,
			hint: 'Eating more than you burn',
		},
		balanced: {
			color: '#94897E',
			text: '#262135',
			icon: 'swap-horizontal' as const,
			title: 'Right on balance',
			hint: 'Eating about what you burn',
		},
	}[kind];

	return (
		<View
			className="flex-row items-center justify-center rounded-2xl px-3.5 py-3 mt-5"
			style={{ backgroundColor: `${theme.color}1F` }}
		>
			<View
				className="w-9 h-9 rounded-full items-center justify-center"
				style={{ backgroundColor: `${theme.color}40` }}
			>
				<Ionicons name={theme.icon} size={18} color={theme.text} />
			</View>
			<View className="ml-3 items-center" style={{ flexShrink: 1 }}>
				<Text
					className="font-JakartaExtraBold text-[15px] text-center"
					style={{ color: theme.text }}
				>
					{isLoading ? '...' : theme.title}
				</Text>
				<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-0.5 text-center">
					{theme.hint}
				</Text>
			</View>
		</View>
	);
};

const MEAL_LABELS: Record<string, string> = {
	breakfast: 'Breakfast',
	lunch: 'Lunch',
	dinner: 'Dinner',
	snack: 'Snacks',
};

// Home calorie card: an Eaten ring (by meal, vs the calorie target) and a Burned ring
// (by source, vs TDEE), with the deficit / surplus below.
const CalorieHero = ({
	eaten,
	burned,
	goal,
	burnTarget,
	mealCalories,
	burnBreakdown,
	isLoading,
	onEatenPress,
	onBurnedPress,
}: {
	onEatenPress?: () => void; // → Food log
	onBurnedPress?: () => void; // → Activity
	eaten: number;
	burned: number;
	goal: number;
	burnTarget: number;
	mealCalories: Record<string, number>; // breakfast / lunch / dinner / snack
	burnBreakdown: { resting: number; steps: number; exercise: number };
	isLoading: boolean;
}) => {
	// Meal sections share one status colour, like the Food log bar
	const eatenColor = statusColor(goal ? (eaten / goal) * 100 : 0);
	const mealSections: RingSection[] = ['breakfast', 'lunch', 'dinner', 'snack'].map(type => ({
		key: type,
		label: MEAL_LABELS[type],
		value: mealCalories[type] || 0,
		color: eatenColor,
	}));
	// Logged meals that the per-meal list missed (e.g. still loading) still fill the ring
	const listed = mealSections.reduce((sum, s) => sum + s.value, 0);
	if (eaten - listed > 1) {
		mealSections.push({ key: 'other', label: 'Other', value: eaten - listed, color: eatenColor });
	}

	// Same source colours as the Activity page burn bar
	const burnSections: RingSection[] = [
		{ key: 'resting', label: 'Resting', value: burnBreakdown.resting, color: '#E3BBA1' },
		{ key: 'steps', label: 'Steps', value: burnBreakdown.steps, color: '#8FA9BA' },
		{ key: 'exercise', label: 'Exercise', value: burnBreakdown.exercise, color: '#7DB88A' },
	];

	return (
		<View className="w-full">
			<View className="flex-row items-start">
				<SectionRing
					label="Eaten"
					icon="restaurant"
					total={eaten}
					target={goal}
					sections={mealSections}
					isLoading={isLoading}
					trackColor={`${eatenColor}2E`}
					onPress={onEatenPress}
				/>
				<SectionRing
					label="Burned"
					icon="flame"
					total={burned}
					target={burnTarget}
					sections={burnSections}
					isLoading={isLoading}
					trackColor="#EEEEEE"
					onPress={onBurnedPress}
				/>
			</View>
			<BalanceCard eaten={eaten} burned={burned} isLoading={isLoading} />
		</View>
	);
};

export default CalorieHero;
