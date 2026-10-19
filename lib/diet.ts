import {
	DEFAULT_DIET_TYPE,
	DEFAULT_FASTING_SCHEDULE,
	DEFAULT_FASTING_START_HOUR,
	DIET_MACRO_SPLITS,
	DIET_TYPES,
	FASTING_EATING_HOURS,
	FASTING_SCHEDULES,
	resolveDietType,
	type DietType,
	type FastingSchedule,
} from './nutritionTargets';

export { DIET_TYPES, FASTING_SCHEDULES, type DietType, type FastingSchedule };

export const DIET_INFO: Record<DietType, { label: string; description: string }> = {
	balanced: { label: 'Balanced', description: 'An even mix for everyday eating' },
	high_protein: { label: 'High Protein', description: 'For lifting, cutting and staying full' },
	low_carb: { label: 'Low Carb', description: 'Fewer carbs, more protein and fat' },
	keto: { label: 'Keto', description: 'Very low carb, under 30 g a day' },
};

export const FASTING_INFO: Record<FastingSchedule, { label: string; description: string }> = {
	off: { label: 'Off', description: 'No eating window' },
	'16_8': { label: '16:8', description: 'Fast 16h, eat within 8h' },
	'18_6': { label: '18:6', description: 'Fast 18h, eat within 6h' },
	'20_4': { label: '20:4', description: 'Fast 20h, eat within 4h' },
	omad: { label: 'OMAD', description: 'One meal a day' },
};

export const resolveFastingSchedule = (value?: string | null): FastingSchedule =>
	value && (FASTING_SCHEDULES as string[]).includes(value)
		? (value as FastingSchedule)
		: DEFAULT_FASTING_SCHEDULE;

export const resolveFastingStartHour = (value?: number | string | null): number => {
	const hour = Number(value);
	return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_FASTING_START_HOUR;
};

export { resolveDietType, DEFAULT_DIET_TYPE };

/** "30 / 20 / 50" — protein / carbs / fat percentages for the diet. */
export const formatDietSplit = (diet: DietType) => {
	const split = DIET_MACRO_SPLITS[diet];
	return [split.protein, split.carbs, split.fats].map(v => Math.round(v * 100)).join(' / ');
};

export const formatHour = (hour: number) => {
	const h = ((hour % 24) + 24) % 24;
	const suffix = h < 12 ? 'am' : 'pm';
	const display = h % 12 === 0 ? 12 : h % 12;
	return `${display}${suffix}`;
};

/** "12pm–8pm" for an eating window, or null when fasting is off. */
export const formatEatingWindow = (schedule: FastingSchedule, startHour: number) => {
	if (schedule === 'off') return null;
	return `${formatHour(startHour)}–${formatHour(startHour + FASTING_EATING_HOURS[schedule])}`;
};

/**
 * Short label for Home: the diet name only when it isn't the default, plus the
 * fasting schedule when one is set — "Keto · 16:8", "16:8", "High Protein",
 * or "Balanced" when nothing is customised.
 */
export const formatDietLabel = (diet: DietType, schedule: FastingSchedule) => {
	const parts: string[] = [];
	if (diet !== DEFAULT_DIET_TYPE) parts.push(DIET_INFO[diet].label);
	if (schedule !== 'off') parts.push(FASTING_INFO[schedule].label);
	return parts.length ? parts.join(' · ') : DIET_INFO[DEFAULT_DIET_TYPE].label;
};
