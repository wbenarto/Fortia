import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { useCyclingPlaceholder } from '@/lib/useCyclingPlaceholder';
import { useUserProfile } from '@/lib/userUtils';
import { formatWeight, useUnitSystem } from '@/lib/units';
import {
	INTENSITIES,
	activityCalories,
	distanceCalories,
	distanceStep,
	distanceUnitFor,
	formatPace,
	iconForActivityName,
	toMiles,
	useActivityTypes,
	type ActivityType,
	type Intensity,
} from '@/lib/activityTypes';

type ModalView = 'list' | 'details' | 'new' | 'result';

const ACCENT = '#E3BBA1';
const INK = '#262135';
const DURATION_PRESETS = [15, 30, 45, 60, 90];
const DEFAULT_MINUTES = 30;
const FALLBACK_WEIGHT_LBS = 160;

// Plain activity names plus a duration, distance or sets×reps — the shape the
// exercise-analysis prompt estimates calories from most reliably.
const EXERCISE_PLACEHOLDERS = [
	{ exercise: 'Running', amount: '30 min' },
	{ exercise: 'Cycling', amount: '45 min' },
	{ exercise: 'Walking', amount: '2 miles' },
	{ exercise: 'Bench press', amount: '3x10 135 lb' },
	{ exercise: 'Swimming laps', amount: '20 min' },
	{ exercise: 'Squats', amount: '4x8 185 lb' },
	{ exercise: 'Yoga', amount: '1 hour' },
	{ exercise: 'Rowing machine', amount: '2000 m' },
	{ exercise: 'Push-ups', amount: '3x20' },
	{ exercise: 'Pickleball', amount: '1 hour' },
	{ exercise: 'Hiking', amount: '5 miles' },
	{ exercise: 'Jump rope', amount: '15 min' },
];

const RECENT_LIMIT = 15;

interface ExerciseEntry {
	name: string;
	duration: string;
	calories_burned: number | null;
}

interface ExerciseRow {
	exercise: string;
	amount: string;
}

const roundValue = (value: unknown) => Math.round(Number(value) || 0);

const eyebrowStyle = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

const emptyRow = (): ExerciseRow => ({ exercise: '', amount: '' });

// Logging an activity: pick a type (running, cycling, swimming…), set duration and
// intensity, and calories come from the activity's MET value and the user's weight
// (activity_types in the DB — no AI call). Recents re-log in one tap. Only "Other"
// (free text) still asks Gemini to estimate calories.
const NewWorkoutModal = ({
	isVisible,
	onClose,
	onSaved,
}: {
	isVisible: boolean;
	onClose: () => void;
	onSaved?: () => void;
}) => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [view, setView] = useState<ModalView>('list');
	const [search, setSearch] = useState('');
	const [recents, setRecents] = useState<ExerciseEntry[]>([]);
	const [rows, setRows] = useState<ExerciseRow[]>([emptyRow()]);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const [saved, setSaved] = useState<ExerciseEntry[]>([]);
	const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
	const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
	const [intensity, setIntensity] = useState<Intensity>('moderate');
	const [distance, setDistance] = useState('');
	// Distance activities: log by distance (time optional) or by time
	const [mode, setMode] = useState<'distance' | 'time'>('time');
	const [timeKnown, setTimeKnown] = useState(true);
	const activityTypes = useActivityTypes();
	const profile = useUserProfile();
	const unitSystem = useUnitSystem();
	const weightLbs = Number(profile.weight) || FALLBACK_WEIGHT_LBS;
	const { index: placeholderIndex, opacity: placeholderOpacity } = useCyclingPlaceholder(
		EXERCISE_PLACEHOLDERS.length
	);

	// Most recent first, one entry per name + amount, from everything the user has logged
	const fetchRecents = async () => {
		if (!user?.id) return;
		try {
			const response = await fetchAPI(`/api/workouts?clerkId=${user.id}`, { method: 'GET' });
			const sessions: any[] = response.success ? response.workouts || [] : [];
			const seen = new Set<string>();
			const entries: ExerciseEntry[] = [];
			sessions
				.slice()
				.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
				.forEach(session =>
					(session.exercises || []).forEach((exercise: any) => {
						const name = String(exercise.name || '').trim();
						const duration = String(exercise.duration || '').trim();
						const key = `${name.toLowerCase()}|${duration.toLowerCase()}`;
						if (!name || !duration || seen.has(key)) return;
						seen.add(key);
						entries.push({ name, duration, calories_burned: exercise.calories_burned });
					})
				);
			setRecents(entries.slice(0, RECENT_LIMIT));
		} catch (err) {
			console.error('Failed to load recent exercises:', err);
			setRecents([]);
		}
	};

	useEffect(() => {
		if (!isVisible) return;
		setView('list');
		setSearch('');
		setRows([emptyRow()]);
		setError('');
		setSaved([]);
		setSelectedType(null);
		fetchRecents();
	}, [isVisible]);

	const trimmedSearch = search.trim().toLowerCase();
	const visibleRecents = trimmedSearch
		? recents.filter(entry => entry.name.toLowerCase().includes(trimmedSearch))
		: recents;
	const visibleTypes = trimmedSearch
		? activityTypes.filter(type => type.name.toLowerCase().includes(trimmedSearch))
		: activityTypes;

	const openType = (type: ActivityType) => {
		setSelectedType(type);
		setMinutes(DEFAULT_MINUTES);
		setIntensity('moderate');
		setDistance('');
		setMode(type.supports_distance ? 'distance' : 'time');
		setTimeKnown(true);
		setError('');
		setView('details');
	};

	const distanceUnit = selectedType ? distanceUnitFor(selectedType, unitSystem) : 'mi';
	const distanceValue = parseFloat(distance);
	const hasDistance = Number.isFinite(distanceValue) && distanceValue > 0;
	const byDistance = !!selectedType?.supports_distance && mode === 'distance';

	// By distance: speed (or the chosen pace) drives MET. By time: duration × intensity.
	const distanceEstimate =
		selectedType && byDistance && hasDistance
			? distanceCalories(
					selectedType,
					toMiles(distanceValue, distanceUnit),
					timeKnown ? minutes : null,
					intensity,
					weightLbs
				)
			: null;
	const shownIntensity = distanceEstimate?.intensity ?? intensity;
	const intensityIndex = INTENSITIES.indexOf(shownIntensity);
	const previewCalories = !selectedType
		? 0
		: byDistance
			? (distanceEstimate?.calories ?? 0)
			: activityCalories(selectedType, intensity, minutes, weightLbs);
	const pace =
		selectedType && distanceEstimate
			? formatPace(selectedType, distanceEstimate.mph, unitSystem)
			: '';
	// Speed comes from what was typed, so flag paces that are probably a typo
	const speeds = selectedType?.typical_speeds;
	const paceLooksOff =
		!!distanceEstimate &&
		!distanceEstimate.estimatedTime &&
		!!speeds &&
		(distanceEstimate.mph > speeds[2] * 1.8 || distanceEstimate.mph < speeds[0] * 0.4);
	const formatDistance = (value: number) =>
		`${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '')} ${distanceUnit}`;
	const canLog = !byDistance || !!distanceEstimate;

	const postExercise = (entry: ExerciseEntry) =>
		fetchAPI('/api/workouts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				clerkId: user?.id,
				type: 'exercise',
				title: entry.name,
				duration: entry.duration,
				calories_burned: entry.calories_burned,
				selectedDate: getTodayDate(),
			}),
		});

	const logRecent = async (entry: ExerciseEntry) => {
		if (!user?.id) return;
		setError('');
		try {
			const response = await postExercise(entry);
			if (!response.success) {
				setError(response.error || 'Failed to log exercise');
				return;
			}
			onSaved?.();
			onClose();
		} catch (err) {
			console.error('Log recent exercise error:', err);
			setError('Failed to log exercise. Please try again.');
		}
	};

	const logActivity = async () => {
		if (!user?.id || !selectedType || !canLog) return;
		// e.g. "2 mi · 40 min · 20:00 /mi", "2 mi · Steady · ~40 min", "30 min · Steady run"
		const parts = !byDistance
			? [`${minutes} min`, selectedType.intensity_labels[intensityIndex]]
			: distanceEstimate?.estimatedTime
				? [
						formatDistance(distanceValue),
						selectedType.intensity_labels[intensityIndex],
						`~${distanceEstimate.minutes} min`,
					]
				: [formatDistance(distanceValue), `${minutes} min`, pace];

		setIsSaving(true);
		setError('');
		try {
			const response = await postExercise({
				name: selectedType.name,
				duration: parts.join(' · '),
				calories_burned: previewCalories,
			});
			if (!response.success) {
				setError(response.error || 'Failed to log activity');
				return;
			}
			onSaved?.();
			onClose();
		} catch (err) {
			console.error('Log activity error:', err);
			setError('Failed to log activity. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	const analyzeCalories = async (row: ExerciseRow): Promise<number | null> => {
		try {
			const response = await fetchAPI('/api/exercise-analysis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exerciseDescription: row.exercise.trim(),
					duration: row.amount.trim(),
					userId: user?.id,
				}),
			});
			return response.success ? roundValue(response.data?.calories_burned) : null;
		} catch (err) {
			// Still save the exercise; it just won't count toward calories burned
			console.error('Exercise analysis failed:', err);
			return null;
		}
	};

	const saveNew = async () => {
		if (!user?.id) return;

		const validRows = rows.filter(row => row.exercise.trim() && row.amount.trim());
		if (validRows.length === 0) {
			setError('Add at least one exercise with an amount');
			return;
		}

		setIsSaving(true);
		setError('');
		try {
			const calories = await Promise.all(validRows.map(analyzeCalories));
			const entries = validRows.map((row, i) => ({
				name: row.exercise.trim(),
				duration: row.amount.trim(),
				calories_burned: calories[i],
			}));

			const savedEntries: ExerciseEntry[] = [];
			for (const entry of entries) {
				const response = await postExercise(entry);
				if (response.success) savedEntries.push(entry);
			}

			if (savedEntries.length === 0) {
				setError('Failed to save exercise. Please try again.');
				return;
			}
			if (savedEntries.length < entries.length) {
				setError(`Saved ${savedEntries.length} of ${entries.length} exercises.`);
			}

			setSaved(savedEntries);
			setView('result');
			onSaved?.();
		} catch (err) {
			console.error('Save exercise error:', err);
			setError('Failed to save exercise. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	const updateRow = (index: number, field: keyof ExerciseRow, value: string) => {
		setRows(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
	};

	const removeRow = (index: number) => {
		setRows(rows.filter((_, i) => i !== index));
	};

	const renderErrorText = () =>
		error ? <Text className="text-xs text-[#E08585] mb-3">{error}</Text> : null;

	const renderCalories = (calories: number | null) =>
		calories == null ? '— cal' : `${roundValue(calories)} cal`;

	const renderList = () => (
		<View>
			<View className="flex-row justify-between items-center mb-5">
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">Log activity</Text>
				<TouchableOpacity onPress={onClose} hitSlop={10}>
					<Ionicons name="close" size={24} color="#334155" />
				</TouchableOpacity>
			</View>

			<View className="flex-row items-center bg-[#F1F1F1] rounded-full px-4 py-2.5 mb-6">
				<Ionicons name="search" size={16} color="#574F47" />
				<TextInput
					value={search}
					onChangeText={setSearch}
					placeholder="Search activities"
					placeholderTextColor="#574F47"
					className="flex-1 ml-2 text-sm font-JakartaMedium text-[#262135] p-0"
				/>
				{search ? (
					<TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
						<Ionicons name="close-circle" size={16} color="#857869" />
					</TouchableOpacity>
				) : null}
			</View>

			{/* Activity types */}
			<View className="flex-row flex-wrap -mx-1">
				{visibleTypes.map(type => (
					<TouchableOpacity
						key={type.slug}
						onPress={() => openType(type)}
						activeOpacity={0.7}
						className="items-center mb-4 px-1"
						style={{ width: '25%' }}
						accessibilityLabel={`Log ${type.name}`}
					>
						<View className="w-14 h-14 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
							<MaterialCommunityIcons name={type.icon} size={26} color={INK} />
						</View>
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#262135] mt-1.5 text-center"
							numberOfLines={1}
						>
							{type.name}
						</Text>
					</TouchableOpacity>
				))}
				<TouchableOpacity
					onPress={() => {
						setError('');
						setRows([{ exercise: search.trim(), amount: '' }]);
						setView('new');
					}}
					activeOpacity={0.7}
					className="items-center mb-4 px-1"
					style={{ width: '25%' }}
					accessibilityLabel="Log another activity"
				>
					<View className="w-14 h-14 rounded-full bg-white border-[1px] border-dashed border-[#857869] items-center justify-center">
						<MaterialCommunityIcons name="pencil-outline" size={24} color="#574F47" />
					</View>
					<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-1.5">Other</Text>
				</TouchableOpacity>
			</View>

			{/* Recent */}
			{visibleRecents.length > 0 && (
				<>
					<Text
						className="text-[10px] font-JakartaSemiBold text-[#574F47] mt-2 mb-1"
						style={eyebrowStyle}
					>
						Recent
					</Text>
					{visibleRecents.map((entry, index) => (
						<TouchableOpacity
							key={`${entry.name}|${entry.duration}`}
							onPress={() => logRecent(entry)}
							activeOpacity={0.7}
							className={`flex-row items-center py-3 ${
								index < visibleRecents.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
							}`}
						>
							<View
								className="w-9 h-9 rounded-full items-center justify-center"
								style={{ backgroundColor: `${ACCENT}26` }}
							>
								<MaterialCommunityIcons
									name={iconForActivityName(entry.name, activityTypes)}
									size={18}
									color="#cd9c99"
								/>
							</View>
							<View className="flex-1 mx-3">
								<Text className="text-sm font-JakartaBold text-[#262135]" numberOfLines={1}>
									{entry.name}
								</Text>
								<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-0.5">
									{`${entry.duration} · ${renderCalories(entry.calories_burned)}`}
								</Text>
							</View>
							<View className="w-7 h-7 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
								<Ionicons name="add" size={16} color={INK} />
							</View>
						</TouchableOpacity>
					))}
				</>
			)}

			{trimmedSearch && visibleTypes.length === 0 && visibleRecents.length === 0 && (
				<Text className="text-sm text-[#574F47] py-3">
					No matches. Tap Other to log "{search.trim()}".
				</Text>
			)}

			<View className="mt-3">{renderErrorText()}</View>
		</View>
	);

	const renderDurationControl = () => (
		<>
			<View className="flex-row items-center justify-center">
				<RoundButton
					icon="remove"
					onPress={() => setMinutes(m => Math.max(5, m - 5))}
					label="5 minutes less"
				/>
				<View className="flex-row items-baseline mx-6">
					<Text className="font-JakartaExtraBold text-[44px] text-[#262135]">{minutes}</Text>
					<Text className="font-JakartaSemiBold text-base text-[#574F47] ml-1.5">min</Text>
				</View>
				<RoundButton
					icon="add"
					onPress={() => setMinutes(m => Math.min(300, m + 5))}
					label="5 minutes more"
				/>
			</View>
			<View className="flex-row justify-center mt-3" style={{ columnGap: 8 }}>
				{DURATION_PRESETS.map(preset => {
					const selected = minutes === preset;
					return (
						<TouchableOpacity
							key={preset}
							onPress={() => setMinutes(preset)}
							className="px-3 py-1.5 rounded-full"
							style={{ backgroundColor: selected ? ACCENT : '#F1F1F1' }}
						>
							<Text
								className="text-xs font-JakartaSemiBold"
								style={{ color: selected ? '#FFFFFF' : '#334155' }}
							>
								{preset}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</>
	);

	const renderIntensityCards = (type: ActivityType) => (
		<View className="flex-row" style={{ columnGap: 8 }}>
			{INTENSITIES.map((level, i) => {
				const selected = intensity === level;
				return (
					<TouchableOpacity
						key={level}
						onPress={() => setIntensity(level)}
						activeOpacity={0.8}
						accessibilityRole="radio"
						accessibilityState={{ selected }}
						className="flex-1 rounded-2xl px-3 py-3 border-[1px]"
						style={{
							borderColor: selected ? ACCENT : '#F0EBE6',
							backgroundColor: selected ? `${ACCENT}1F` : '#FFFFFF',
						}}
					>
						<View className="flex-row mb-1.5" style={{ columnGap: 3 }}>
							{[0, 1, 2].map(bar => (
								<View
									key={bar}
									className="h-1 flex-1 rounded-full"
									style={{ backgroundColor: bar <= i ? ACCENT : '#F0EBE6' }}
								/>
							))}
						</View>
						<Text className="text-[13px] font-JakartaBold text-[#262135]" numberOfLines={1}>
							{type.intensity_labels[i]}
						</Text>
						<Text
							className="text-[11px] font-JakartaMedium text-[#574F47] mt-0.5"
							numberOfLines={1}
						>
							{type.intensity_hints[i]}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);

	const renderDetails = () => {
		if (!selectedType) return null;
		return (
			<View>
				<View className="flex-row justify-between items-center mb-6">
					<TouchableOpacity
						onPress={() => {
							setError('');
							setView('list');
						}}
						hitSlop={10}
					>
						<Ionicons name="chevron-back" size={24} color={INK} />
					</TouchableOpacity>
					<TouchableOpacity onPress={onClose} hitSlop={10}>
						<Ionicons name="close" size={24} color="#334155" />
					</TouchableOpacity>
				</View>

				<View className="items-center">
					<View
						className="w-16 h-16 rounded-full items-center justify-center"
						style={{ backgroundColor: `${ACCENT}33` }}
					>
						<MaterialCommunityIcons name={selectedType.icon} size={32} color="#B07F62" />
					</View>
					<Text className="text-[22px] font-JakartaExtraBold text-[#262135] mt-3">
						{selectedType.name}
					</Text>
				</View>

				{selectedType.supports_distance && (
					<View className="flex-row bg-[#F1F1F1] rounded-full p-1 mt-6">
						{(['distance', 'time'] as const).map(option => {
							const selected = mode === option;
							return (
								<TouchableOpacity
									key={option}
									onPress={() => setMode(option)}
									className="flex-1 py-2 rounded-full items-center"
									style={{ backgroundColor: selected ? ACCENT : 'transparent' }}
								>
									<Text
										className="text-xs font-JakartaSemiBold"
										style={{ color: selected ? '#FFFFFF' : '#334155' }}
									>
										{option === 'distance' ? 'Distance' : 'Time'}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				)}

				{byDistance ? (
					<>
						{/* Distance */}
						<Text
							className="text-[10px] font-JakartaSemiBold text-[#574F47] mt-7 mb-3"
							style={eyebrowStyle}
						>
							Distance
						</Text>
						<View className="flex-row items-center justify-center">
							<RoundButton
								icon="remove"
								onPress={() =>
									setDistance(d =>
										String(
											Math.max(
												0,
												Math.round(((parseFloat(d) || 0) - distanceStep(distanceUnit)) * 100) / 100
											)
										)
									)
								}
								label="Less distance"
							/>
							<View className="flex-row items-baseline mx-4">
								<TextInput
									value={distance}
									onChangeText={text => setDistance(text.replace(/[^0-9.]/g, ''))}
									placeholder="0"
									placeholderTextColor="#857869"
									keyboardType="decimal-pad"
									className="font-JakartaExtraBold text-[44px] text-[#262135] text-center p-0 min-w-[64px]"
								/>
								<Text className="font-JakartaSemiBold text-base text-[#574F47] ml-1.5">
									{distanceUnit}
								</Text>
							</View>
							<RoundButton
								icon="add"
								onPress={() =>
									setDistance(d =>
										String(
											Math.round(((parseFloat(d) || 0) + distanceStep(distanceUnit)) * 100) / 100
										)
									)
								}
								label="More distance"
							/>
						</View>

						{/* Time (optional) */}
						<View className="flex-row items-center justify-between mt-7 mb-3">
							<Text
								className="text-[10px] font-JakartaSemiBold text-[#574F47]"
								style={eyebrowStyle}
							>
								Time
							</Text>
							<TouchableOpacity onPress={() => setTimeKnown(known => !known)} hitSlop={8}>
								<Text className="text-xs font-JakartaSemiBold text-[#cd9c99]">
									{timeKnown ? "Don't know" : 'Add time'}
								</Text>
							</TouchableOpacity>
						</View>
						{timeKnown ? (
							renderDurationControl()
						) : (
							<Text className="text-xs font-JakartaMedium text-[#574F47]">
								We'll estimate it from your pace below.
							</Text>
						)}

						{timeKnown && selectedType.met_from_speed ? (
							distanceEstimate && (
								<View className="flex-row items-center justify-between bg-[#F9F9F8] border-[1px] border-[#F0EBE6] rounded-2xl px-4 py-3 mt-6">
									<View>
										<Text
											className="text-[10px] font-JakartaSemiBold text-[#574F47]"
											style={eyebrowStyle}
										>
											Pace
										</Text>
										<Text className="font-JakartaBold text-[16px] text-[#262135] mt-0.5">
											{pace}
										</Text>
									</View>
									<Text className="text-xs font-JakartaSemiBold text-[#574F47]">
										{selectedType.intensity_labels[intensityIndex]}
									</Text>
								</View>
							)
						) : (
							<>
								<Text
									className="text-[10px] font-JakartaSemiBold text-[#574F47] mt-7 mb-3"
									style={eyebrowStyle}
								>
									{selectedType.met_from_speed ? 'Pace' : 'Intensity'}
								</Text>
								{renderIntensityCards(selectedType)}
							</>
						)}
						{paceLooksOff && (
							<Text className="text-xs font-JakartaMedium text-[#E08585] mt-2">
								That pace looks unusual — check the distance and time.
							</Text>
						)}
					</>
				) : (
					<>
						<Text
							className="text-[10px] font-JakartaSemiBold text-[#574F47] mt-7 mb-3"
							style={eyebrowStyle}
						>
							Duration
						</Text>
						{renderDurationControl()}
						<Text
							className="text-[10px] font-JakartaSemiBold text-[#574F47] mt-7 mb-3"
							style={eyebrowStyle}
						>
							Intensity
						</Text>
						{renderIntensityCards(selectedType)}
					</>
				)}

				{/* Calories preview */}
				<View className="bg-[#F9F9F8] border-[1px] border-[#F0EBE6] rounded-2xl px-4 py-3 mt-7 flex-row items-center">
					<MaterialCommunityIcons name="fire" size={22} color="#E08585" />
					<View className="flex-1 ml-3">
						<View className="flex-row items-baseline">
							<Text className="font-JakartaExtraBold text-[24px] text-[#262135]">
								{previewCalories}
							</Text>
							<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">cal burned</Text>
						</View>
						<Text className="text-[11px] font-JakartaMedium text-[#574F47]">
							{!byDistance
								? `Estimated for ${formatWeight(weightLbs, unitSystem, 0)} at this intensity`
								: !distanceEstimate
									? 'Enter a distance to estimate calories'
									: distanceEstimate.estimatedTime
										? `About ${distanceEstimate.minutes} min at a ${selectedType.intensity_labels[
												intensityIndex
											].toLowerCase()} pace`
										: `${pace} · for ${formatWeight(weightLbs, unitSystem, 0)}`}
						</Text>
					</View>
				</View>

				<View className="mt-3">{renderErrorText()}</View>
			</View>
		);
	};

	const renderNew = () => (
		<View>
			<View className="flex-row justify-between items-center mb-5">
				<TouchableOpacity
					onPress={() => {
						setError('');
						setView('list');
					}}
				>
					<Ionicons name="chevron-back" size={24} color="#262135" />
				</TouchableOpacity>
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">Other activity</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#334155" />
				</TouchableOpacity>
			</View>

			<Text className="text-xs font-JakartaSemiBold text-black mb-1">Exercises</Text>
			<View className="mb-4">
				{rows.map((row, index) => (
					<View key={index} className="flex-row items-center gap-2 mb-3">
						<View className="flex-1 justify-center">
							<TextInput
								value={row.exercise}
								onChangeText={value => updateRow(index, 'exercise', value)}
								className="text-sm text-[#262135] border-b-[1px] border-[#F0EBE6] pb-1"
							/>
							{!row.exercise && (
								<Animated.Text
									pointerEvents="none"
									style={{ opacity: placeholderOpacity }}
									className="absolute left-0 pb-1 text-sm text-[#574F47]"
									numberOfLines={1}
								>
									{EXERCISE_PLACEHOLDERS[placeholderIndex].exercise}
								</Animated.Text>
							)}
						</View>
						<View className="w-28 justify-center">
							<TextInput
								value={row.amount}
								onChangeText={value => updateRow(index, 'amount', value)}
								className="text-sm text-[#262135] border-b-[1px] border-[#F0EBE6] pb-1"
							/>
							{!row.amount && (
								<Animated.Text
									pointerEvents="none"
									style={{ opacity: placeholderOpacity }}
									className="absolute left-0 pb-1 text-sm text-[#574F47]"
									numberOfLines={1}
								>
									{EXERCISE_PLACEHOLDERS[placeholderIndex].amount}
								</Animated.Text>
							)}
						</View>
						{rows.length > 1 && (
							<TouchableOpacity onPress={() => removeRow(index)}>
								<Ionicons name="close-circle-outline" size={18} color="#94A3B8" />
							</TouchableOpacity>
						)}
					</View>
				))}
				<TouchableOpacity onPress={() => setRows([...rows, emptyRow()])}>
					<Text className="text-xs font-JakartaSemiBold text-[#334155]">+ Add another</Text>
				</TouchableOpacity>
			</View>

			{renderErrorText()}

			<TouchableOpacity
				onPress={saveNew}
				disabled={isSaving}
				className={`rounded-xl py-3 mt-4 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'}`}
			>
				<Text
					className={`text-center font-JakartaSemiBold ${isSaving ? 'text-[#334155]' : 'text-white'}`}
				>
					{isSaving ? 'Analyzing and saving…' : 'Save exercise'}
				</Text>
			</TouchableOpacity>
		</View>
	);

	const renderResult = () => {
		const total = saved.reduce((sum, entry) => sum + (entry.calories_burned || 0), 0);
		return (
			<View>
				<View className="flex-row justify-between items-center mb-5">
					<Text className="text-xl font-JakartaExtraBold text-[#262135]">Saved</Text>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={24} color="#334155" />
					</TouchableOpacity>
				</View>

				<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={eyebrowStyle}>
					Calories burned
				</Text>
				<View className="flex-row items-baseline">
					<Text className="font-JakartaExtraBold text-[30px] text-[#262135]">{total}</Text>
					<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">cal</Text>
				</View>

				<View className="mt-4">
					{saved.map((entry, index) => (
						<View key={index} className="flex-row items-center justify-between mt-2">
							<Text
								className="font-JakartaMedium text-xs text-[#334155] flex-1 pr-3"
								numberOfLines={1}
							>
								{entry.name} · {entry.duration}
							</Text>
							<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]">
								{renderCalories(entry.calories_burned)}
							</Text>
						</View>
					))}
				</View>

				<View className="mt-3">{renderErrorText()}</View>
			</View>
		);
	};

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			avoidKeyboard
			className="m-0 w-full h-full"
		>
			<View className="bg-white w-full" style={{ flex: 1, paddingTop: insets.top }}>
				<ScrollView
					className="px-6 pt-6"
					contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					style={{ flex: 1 }}
				>
					{view === 'list' && renderList()}
					{view === 'details' && renderDetails()}
					{view === 'new' && renderNew()}
					{view === 'result' && renderResult()}
				</ScrollView>

				{(view === 'details' || view === 'result') && (
					<View
						className="px-6 pt-3 border-t-[1px] border-[#F0EBE6]"
						style={{ paddingBottom: 24 + insets.bottom }}
					>
						{view === 'details' ? (
							<TouchableOpacity
								onPress={logActivity}
								disabled={isSaving || !canLog}
								className={`rounded-xl py-3.5 ${
									isSaving || !canLog ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'
								}`}
							>
								<Text
									className={`text-center font-JakartaSemiBold ${
										isSaving || !canLog ? 'text-[#334155]' : 'text-white'
									}`}
								>
									{isSaving
										? 'Saving…'
										: canLog
											? `Log ${previewCalories} cal`
											: 'Enter a distance'}
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity onPress={onClose} className="bg-[#E3BBA1] rounded-xl py-3">
								<Text className="text-white text-center font-JakartaSemiBold">Done</Text>
							</TouchableOpacity>
						)}
					</View>
				)}
			</View>
		</ReactNativeModal>
	);
};

const RoundButton = ({
	icon,
	onPress,
	label,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	onPress: () => void;
	label: string;
}) => (
	<TouchableOpacity
		onPress={onPress}
		accessibilityLabel={label}
		className="w-11 h-11 rounded-full bg-[#F1F1F1] items-center justify-center"
	>
		<Ionicons name={icon} size={20} color={INK} />
	</TouchableOpacity>
);

export default NewWorkoutModal;
