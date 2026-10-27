import { getTodayDate } from '@/lib/dateUtils';
import { toDisplayWeight, weightUnit, type UnitSystem } from '@/lib/units';

// Shapes from GET /api/progress (fortia-api src/lib/progress.ts).

export interface ProgressDay {
	date: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	mealCount: number;
	weight: number | null; // lb
	activeCalories: number;
	steps: number | null;
	workoutMinutes: number;
	trained: boolean;
	logged: { meal: boolean; weight: boolean; exercise: boolean };
	calorieStatus: 'on' | 'under' | 'over' | null;
}

export interface Insight {
	id: string;
	tone: 'good' | 'neutral' | 'attention';
	icon: string;
	text: string; // may contain {w} / {w2} — weights in lb
	weightLb?: number;
	weightLb2?: number;
}

export type Area = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core';

export interface ProgressData {
	from: string;
	to: string;
	days: ProgressDay[];
	targets: {
		calories: number;
		protein: number;
		carbs: number;
		fats: number;
		weight: number | null;
		startingWeight: number | null;
		fitnessGoal: string | null;
	};
	summary: {
		nutrition: {
			daysLogged: number;
			onTargetDays: number;
			underDays: number;
			overDays: number;
			avgCalories: number | null;
			avgProtein: number | null;
			avgCarbs: number | null;
			avgFats: number | null;
			avgProteinPct: number | null;
			proteinHitDays: number;
			weekendDelta: number | null;
		};
		weight: {
			weighIns: number;
			weighInsPerWeek: number | null;
			start: number | null;
			end: number | null;
			change: number | null;
			ratePerWeek: number | null;
			latest: number | null;
			toGo: number | null;
			projectedDate: string | null;
			lastWeighIn: string | null;
			daysSinceWeighIn: number | null;
		};
		activity: {
			workoutDays: number;
			workoutsPerWeek: number | null;
			weeklyGoal: number;
			cardioMinutes: number;
			cardioMinutesPerWeek: number;
			cardioWeeklyTarget: number;
			avgActiveCalories: number | null;
			avgSteps: number | null;
			muscleBalance: { area: Area; sets: number; lastTrained: string | null }[];
		};
		consistency: {
			currentStreak: number;
			bestStreak: number;
			daysInRange: number;
			daysWithAnyLog: number;
			mealDays: number;
			loggingRate: number | null;
			perfectDays: number;
		};
	};
	insights: Insight[];
}

// --- Ranges ---------------------------------------------------------------------------

export type RangeKey = 'week' | 'month' | 'quarter';
export const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
	{ key: 'week', label: 'Week', days: 7 },
	{ key: 'month', label: 'Month', days: 30 },
	{ key: 'quarter', label: '3 months', days: 90 },
];

const toUTC = (d: string) =>
	Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
export const addDays = (d: string, n: number) =>
	new Date(toUTC(d) + n * 86_400_000).toISOString().slice(0, 10);
export const weekday = (d: string) => new Date(toUTC(d)).getUTCDay(); // 0 = Sunday

// Week = the current calendar week so far (Sunday → today); month / 3 months roll back
// from today.
export const weekStart = (date: string) => addDays(date, -weekday(date));

export const rangeFor = (key: RangeKey, to = getTodayDate()) => {
	if (key === 'week') return { from: weekStart(to), to };
	const days = RANGE_OPTIONS.find(r => r.key === key)!.days;
	return { from: addDays(to, -(days - 1)), to };
};

// Last full Sunday–Saturday week before the current one
export const lastWeekRange = (today = getTodayDate()) => {
	const thisSunday = weekStart(today);
	return { from: addDays(thisSunday, -7), to: addDays(thisSunday, -1) };
};

// `today` lets the API tell finished days from the one still in progress
export const progressUrl = (clerkId: string, from: string, to: string) =>
	`/api/progress?clerkId=${clerkId}&from=${from}&to=${to}&today=${getTodayDate()}`;

// --- Formatting -------------------------------------------------------------------------

export const formatInsight = (insight: Insight, system: UnitSystem) => {
	const fmt = (lb?: number) =>
		lb == null
			? ''
			: `${toDisplayWeight(lb, system).toFixed(1).replace(/\.0$/, '')} ${weightUnit(system)}`;
	return insight.text.replace('{w}', fmt(insight.weightLb)).replace('{w2}', fmt(insight.weightLb2));
};

export const TONE_STYLE: Record<Insight['tone'], { color: string; bg: string }> = {
	good: { color: '#5E9A6C', bg: '#7DB88A1F' },
	neutral: { color: '#94897E', bg: '#F1F1F1' },
	attention: { color: '#C77A5E', bg: '#E3BBA12E' },
};

// Per-day calorie status → design-system status colours
export const CALORIE_STATUS_COLOR: Record<'on' | 'under' | 'over', string> = {
	on: '#7DB88A',
	under: '#F2D58E',
	over: '#E08585',
};

export const DOT_COLORS = { meal: '#E3BBA1', weight: '#8FA9BA', exercise: '#7DB88A' } as const;

export const shortDate = (d: string) =>
	new Date(toUTC(d)).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	});

export const dayLetter = (d: string) => 'SMTWTFS'[weekday(d)];
