import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from 'react-native-reanimated';
import { MACRO_COLORS } from '@/lib/theme';

export interface Macros {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
}

const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const OVER = '#E08585';
const CALORIE_COLOR = '#D4A07E';
// All rows are on screen right away; every bar fills and every number ticks up together
const FILL_DELAY = 250;
const FILL_MS = 900;

// Counts a number up from `from` to `to` after `delay` ms
const useCountUp = (from: number, to: number, delay: number, duration = 700) => {
	const [value, setValue] = useState(from);
	useEffect(() => {
		let frame: ReturnType<typeof requestAnimationFrame>;
		const start = Date.now() + delay;
		const tick = () => {
			const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
			const eased = 1 - Math.pow(1 - t, 3);
			setValue(from + (to - from) * eased);
			if (t < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [from, to, delay, duration]);
	return value;
};

// One bar: what was already eaten (faded), plus this meal's share growing in
const ImpactRow = ({
	label,
	unit,
	color,
	before,
	added,
	target,
	delay,
	large = false,
}: {
	label: string;
	unit: string;
	color: string;
	before: number;
	added: number;
	target: number;
	delay: number;
	large?: boolean;
}) => {
	const after = before + added;
	const safeTarget = target > 0 ? target : 1;
	const beforePct = Math.min(1, before / safeTarget);
	const afterPct = Math.min(1, after / safeTarget);
	const isOver = after > target && target > 0;
	const fillColor = isOver ? OVER : color;

	const grow = useSharedValue(0);
	useEffect(() => {
		grow.value = 0;
		grow.value = withDelay(
			delay,
			withTiming(1, { duration: FILL_MS, easing: Easing.out(Easing.cubic) })
		);
	}, [before, added, target]);

	const addedStyle = useAnimatedStyle(() => ({
		width: `${(afterPct - beforePct) * grow.value * 100}%`,
	}));

	const shown = useCountUp(before, after, delay, FILL_MS);
	const remaining = Math.round(target - shown);

	return (
		<View className={large ? 'mb-4' : 'mb-3'}>
			<View className="flex-row items-baseline justify-between mb-1.5">
				<View className="flex-row items-center">
					<View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
					<Text className="text-[12px] font-JakartaSemiBold text-[#262135]">{label}</Text>
					{added > 0 && (
						<View
							className="ml-2 px-1.5 rounded-full"
							style={{ backgroundColor: `${fillColor}26` }}
						>
							<Text
								className="text-[10px] font-JakartaBold"
								style={{ color: isOver ? '#B54848' : '#262135' }}
							>
								+{Math.round(added).toLocaleString()}
								{unit === 'cal' ? '' : unit}
							</Text>
						</View>
					)}
				</View>
				<Text className="text-[12px] font-JakartaMedium text-[#574F47]">
					<Text
						className={`font-JakartaBold text-[#262135] ${large ? 'text-[16px]' : 'text-[13px]'}`}
					>
						{Math.round(shown).toLocaleString()}
					</Text>{' '}
					/ {Math.round(target).toLocaleString()}
					{unit === 'cal' ? ' cal' : unit}
				</Text>
			</View>

			<View
				className="flex-row rounded-full overflow-hidden"
				style={{ height: large ? 10 : 6, backgroundColor: `${color}2E` }}
			>
				<View style={{ width: `${beforePct * 100}%`, backgroundColor: fillColor, opacity: 0.45 }} />
				<Animated.View style={[{ backgroundColor: fillColor }, addedStyle]} />
			</View>

			<Text
				className="text-[11px] font-JakartaMedium mt-1 text-right"
				style={{ color: isOver ? '#B54848' : '#574F47' }}
			>
				{isOver
					? `${Math.abs(remaining).toLocaleString()}${unit === 'cal' ? ' cal' : unit} over`
					: `${remaining.toLocaleString()}${unit === 'cal' ? ' cal' : unit} left`}
			</Text>
		</View>
	);
};

// "How this meal moves the day": calories and macros, before → after, against targets
const MealImpact = ({
	before,
	meal,
	targets,
	dayLabel,
}: {
	before: Macros;
	meal: Macros;
	targets: Macros;
	dayLabel: string;
}) => (
	<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mt-4">
		<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-3" style={EYEBROW_STYLE}>
			{dayLabel === 'Today' ? "Today's totals" : `${dayLabel} totals`}
		</Text>
		<ImpactRow
			label="Calories"
			unit="cal"
			color={CALORIE_COLOR}
			before={before.calories}
			added={meal.calories}
			target={targets.calories}
			delay={FILL_DELAY}
			large
		/>
		<ImpactRow
			label="Protein"
			unit="g"
			color={MACRO_COLORS.protein}
			before={before.protein}
			added={meal.protein}
			target={targets.protein}
			delay={FILL_DELAY}
		/>
		<ImpactRow
			label="Carbs"
			unit="g"
			color={MACRO_COLORS.carbs}
			before={before.carbs}
			added={meal.carbs}
			target={targets.carbs}
			delay={FILL_DELAY}
		/>
		<ImpactRow
			label="Fat"
			unit="g"
			color={MACRO_COLORS.fats}
			before={before.fats}
			added={meal.fats}
			target={targets.fats}
			delay={FILL_DELAY}
		/>
	</View>
);

export default MealImpact;
