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
	| 'core'
	| 'biceps'
	| 'triceps'
	| 'forearms'
	| 'lats'
	| 'traps'
	| 'lower_back'
	| 'abs'
	| 'quads'
	| 'hamstrings'
	| 'calves';
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
	// Specific muscles — the API matches these on each exercise's primary muscle
	{ key: 'biceps', label: 'Biceps' },
	{ key: 'triceps', label: 'Triceps' },
	{ key: 'forearms', label: 'Forearms' },
	{ key: 'lats', label: 'Lats' },
	{ key: 'traps', label: 'Traps' },
	{ key: 'lower_back', label: 'Lower back' },
	{ key: 'abs', label: 'Abs' },
	{ key: 'quads', label: 'Quads' },
	{ key: 'hamstrings', label: 'Hamstrings' },
	{ key: 'calves', label: 'Calves' },
];

// How the Focus step lays the options out: broad areas first, then muscles by region
export const FOCUS_GROUPS: { title: string; keys: FocusKey[] }[] = [
	{ title: 'Areas', keys: ['full_body', 'upper', 'lower', 'push', 'pull'] },
	{
		title: 'Upper body',
		keys: ['chest', 'back', 'shoulders', 'arms', 'biceps', 'triceps', 'forearms', 'lats', 'traps'],
	},
	{ title: 'Core', keys: ['core', 'abs', 'lower_back'] },
	{ title: 'Lower body', keys: ['legs', 'glutes', 'quads', 'hamstrings', 'calves'] },
];

// Muscles with no bodyweight exercises in the library — with no equipment the
// API widens to other moves, so the builder warns about it
export const NEEDS_EQUIPMENT_FOCUS: FocusKey[] = [
	'biceps',
	'forearms',
	'lats',
	'traps',
	'lower_back',
	'calves',
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
	progress: {
		sets?: Record<string, SetProgress[]>;
		activeSeconds?: number;
		index?: number;
		// Epoch ms the clock was last saved while running (null = paused / not running).
		// Lets the timer keep going while the user is off the player screen.
		runningSince?: number | null;
	};
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

// --- Calories from the sets actually done ---------------------------------------
// Each completed set = work time × the exercise's intensity (net MET, BMR already
// counted) + the rest after it at a light intensity + the work of moving the load.
// Unticked sets add nothing. Falls back to the time-based estimate when no set is ticked.

const SECONDS_PER_REP = 3;
const REST_NET_MET = 1.5; // heart rate stays up between sets (~MET 2.5)
const LIFT_HEIGHT_M = 0.5; // typical range of motion
const MUSCLE_EFFICIENCY = 0.25; // only ~25% of the energy used becomes mechanical work

const workMet = (exercise: LibraryExercise | undefined) => {
	switch (exercise?.category) {
		case 'plyometrics':
			return 9;
		case 'cardio':
			return 7;
		case 'stretching':
			return 2.3;
		case 'strength':
		case 'powerlifting':
			return exercise.mechanic === 'compound' ? 8 : exercise.mechanic === 'isolation' ? 5 : 6;
		default:
			return 5;
	}
};

export interface SetCalorieEstimate {
	calories: number;
	reps: number;
	volumeLbs: number; // total weight × reps lifted
	setsDone: number;
}

export const estimateCaloriesFromSets = (
	workout: UserWorkout,
	sets: Record<string, SetProgress[]>,
	bodyWeightLbs: number
): SetCalorieEstimate => {
	const bodyKg = bodyWeightLbs / 2.20462;
	let kcal = 0;
	let reps = 0;
	let volumeLbs = 0;
	let setsDone = 0;

	workout.blocks.forEach((block, index) => {
		const exercise = workout.exercises[block.slug];
		const netMet = Math.max(0, workMet(exercise) - 1);
		for (const set of sets[index] ?? []) {
			if (!set?.done) continue;
			setsDone += 1;
			const setReps = block.reps === null ? 0 : (set.reps ?? block.reps ?? 0);
			const workSeconds = block.reps === null ? (block.seconds ?? 0) : setReps * SECONDS_PER_REP;
			kcal += netMet * bodyKg * (workSeconds / 3600);
			kcal += REST_NET_MET * bodyKg * ((block.rest || 0) / 3600);
			if (set.weight && setReps) {
				const loadKg = set.weight / 2.20462;
				kcal += (loadKg * 9.81 * LIFT_HEIGHT_M * setReps) / MUSCLE_EFFICIENCY / 4184;
				volumeLbs += set.weight * setReps;
			}
			reps += setReps;
		}
	});

	return { calories: Math.round(kcal), reps, volumeLbs: Math.round(volumeLbs), setsDone };
};

// Active seconds so far: the saved total plus time since it was saved, if still running
export const elapsedSeconds = (progress: UserWorkout['progress'] | undefined, now = Date.now()) =>
	(progress?.activeSeconds || 0) +
	(progress?.runningSince ? Math.max(0, Math.floor((now - progress.runningSince) / 1000)) : 0);
