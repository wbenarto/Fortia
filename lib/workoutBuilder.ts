import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Builder vocabulary — keys must match fortia-api src/lib/exerciseLibrary.ts.

export type FocusKey =
	| 'full_body'
	| 'upper'
	| 'lower'
	| 'push'
	| 'pull'
	| 'chest'
	| 'back'
	| 'shoulders'
	| 'arms'
	| 'legs'
	| 'glutes'
	| 'core';
export type StyleKey = 'strength' | 'muscle' | 'hiit' | 'cardio' | 'mobility';
export type LocationKey = 'gym' | 'home' | 'anywhere';
export type EquipmentKey =
	| 'dumbbells'
	| 'barbell'
	| 'bench'
	| 'cable'
	| 'machines'
	| 'pull_up_bar'
	| 'kettlebell'
	| 'bands'
	| 'ez_bar'
	| 'smith_machine'
	| 'medicine_ball'
	| 'cardio_machine'
	| 'foam_roll';

export const DURATIONS = [15, 30, 45, 60, 90] as const;

export const FOCUS_OPTIONS: { key: FocusKey; label: string }[] = [
	{ key: 'full_body', label: 'Full body' },
	{ key: 'upper', label: 'Upper' },
	{ key: 'lower', label: 'Lower' },
	{ key: 'push', label: 'Push' },
	{ key: 'pull', label: 'Pull' },
	{ key: 'chest', label: 'Chest' },
	{ key: 'back', label: 'Back' },
	{ key: 'shoulders', label: 'Shoulders' },
	{ key: 'arms', label: 'Arms' },
	{ key: 'legs', label: 'Legs' },
	{ key: 'glutes', label: 'Glutes' },
	{ key: 'core', label: 'Core' },
];
export const MAX_FOCUS = 4;

export const STYLE_OPTIONS: {
	key: StyleKey;
	label: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
}[] = [
	{ key: 'strength', label: 'Strength', description: 'Heavy, low reps', icon: 'barbell-outline' },
	{ key: 'muscle', label: 'Build muscle', description: '8–12 reps', icon: 'body-outline' },
	{ key: 'hiit', label: 'HIIT', description: 'Fast circuits', icon: 'flash-outline' },
	{ key: 'cardio', label: 'Cardio', description: 'Heart rate up', icon: 'heart-outline' },
	{ key: 'mobility', label: 'Mobility', description: 'Stretch & move', icon: 'leaf-outline' },
];

export const LOCATION_OPTIONS: { key: LocationKey; label: string }[] = [
	{ key: 'gym', label: 'Gym' },
	{ key: 'home', label: 'Home' },
	{ key: 'anywhere', label: 'Anywhere' },
];

export const EQUIPMENT_LABELS: Record<EquipmentKey, string> = {
	dumbbells: 'Dumbbells',
	barbell: 'Barbell',
	bench: 'Bench',
	cable: 'Cable',
	machines: 'Machines',
	pull_up_bar: 'Pull-up bar',
	kettlebell: 'Kettlebell',
	bands: 'Bands',
	ez_bar: 'EZ bar',
	smith_machine: 'Smith machine',
	medicine_ball: 'Medicine ball',
	cardio_machine: 'Cardio machines',
	foam_roll: 'Foam roller',
};

export const GYM_EQUIPMENT: EquipmentKey[] = [
	'dumbbells',
	'barbell',
	'bench',
	'cable',
	'machines',
	'pull_up_bar',
	'kettlebell',
	'bands',
	'ez_bar',
	'smith_machine',
	'medicine_ball',
	'cardio_machine',
	'foam_roll',
];
export const GYM_DEFAULT: EquipmentKey[] = [
	'dumbbells',
	'barbell',
	'bench',
	'cable',
	'machines',
	'pull_up_bar',
	'cardio_machine',
];
export const HOME_EQUIPMENT: EquipmentKey[] = [
	'dumbbells',
	'bands',
	'kettlebell',
	'pull_up_bar',
	'bench',
	'foam_roll',
];

export interface BuilderPrefs {
	duration: number;
	focus: FocusKey[];
	location: LocationKey;
	gymEquipment: EquipmentKey[];
	homeEquipment: EquipmentKey[];
	style: StyleKey;
}

export const DEFAULT_PREFS: BuilderPrefs = {
	duration: 45,
	focus: ['full_body'],
	location: 'gym',
	gymEquipment: GYM_DEFAULT,
	homeEquipment: [],
	style: 'muscle',
};

const PREFS_KEY = 'workout-builder-prefs';

// Remember the last builder selection (per device). Plain AsyncStorage, like lib/units.ts.
export const loadBuilderPrefs = async (): Promise<BuilderPrefs> => {
	try {
		const raw = await AsyncStorage.getItem(PREFS_KEY);
		return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
	} catch {
		return DEFAULT_PREFS;
	}
};

export const saveBuilderPrefs = (prefs: BuilderPrefs) =>
	AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});

export const equipmentFor = (prefs: BuilderPrefs): EquipmentKey[] =>
	prefs.location === 'gym'
		? prefs.gymEquipment
		: prefs.location === 'home'
			? prefs.homeEquipment
			: [];

// --- Workout shapes (from /api/user-workouts and /api/workout-builder) ----------

export type Section = 'warmup' | 'main' | 'cooldown';

export interface WorkoutBlock {
	section: Section;
	slug: string;
	sets: number;
	reps: number | null;
	seconds: number | null;
	rest: number;
}

export interface LibraryExercise {
	slug: string;
	name: string;
	category: string;
	mechanic: string | null;
	primary_muscles: string[];
	secondary_muscles: string[];
	equipment: string[];
	instructions: string[];
	images: string[];
}

export interface SetProgress {
	reps: number | null;
	weight: number | null; // stored in lb, like the rest of the app
	done: boolean;
}

export interface UserWorkout {
	id: number;
	title: string;
	inputs: {
		duration: number;
		focus: FocusKey[];
		location: LocationKey;
		equipment: EquipmentKey[];
		style: StyleKey;
	};
	blocks: WorkoutBlock[];
	progress: { sets?: Record<string, SetProgress[]>; activeSeconds?: number; index?: number };
	status: 'planned' | 'in_progress' | 'completed';
	active_minutes: number | null;
	calories: number | null;
	activity_id: number | null;
	est_minutes: number;
	location_label: string;
	exercises: Record<string, LibraryExercise>;
	created_at: string;
	completed_at: string | null;
}

export interface UserWorkoutSummary {
	id: number;
	title: string;
	status: UserWorkout['status'];
	est_minutes: number;
	exercise_count: number;
	calories: number | null;
	created_at: string;
	completed_at: string | null;
}

export const SECTION_LABELS: Record<Section, string> = {
	warmup: 'Warm-up',
	main: 'Workout',
	cooldown: 'Cool-down',
};

export const formatSeconds = (total: number) => {
	const m = Math.floor(total / 60);
	const s = total % 60;
	if (m === 0) return `${s}s`;
	return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')}`;
};

export const formatPrescription = (block: WorkoutBlock) =>
	block.reps
		? `${block.sets} × ${block.reps}`
		: block.sets > 1
			? `${block.sets} × ${formatSeconds(block.seconds || 0)}`
			: formatSeconds(block.seconds || 0);

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Calories for a finished workout, net of resting burn (MET − 1) because calories
// out already counts BMR. Mirrors estimateWorkoutCalories in fortia-api.
const STYLE_MET: Record<StyleKey, number> = {
	strength: 5,
	muscle: 5,
	hiit: 8,
	cardio: 7,
	mobility: 2.5,
};
export const estimateWorkoutCalories = (style: StyleKey, weightLbs: number, minutes: number) =>
	Math.max(0, Math.round((STYLE_MET[style] - 1) * (weightLbs / 2.20462) * (minutes / 60)));
