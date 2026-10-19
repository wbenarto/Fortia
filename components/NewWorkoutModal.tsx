import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { useCyclingPlaceholder } from '@/lib/useCyclingPlaceholder';

type ModalView = 'list' | 'new' | 'result';

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

const inputClass =
	'text-sm font-JakartaMedium text-[#262135] border-b-[1px] border-[#E3BBA1] pb-2 mb-5';

const emptyRow = (): ExerciseRow => ({ exercise: '', amount: '' });

// Logging an exercise: pick a recent one to re-log in one tap, or enter new ones and
// they're analyzed and saved for today. Each exercise is its own entry — no dates,
// no multi-exercise sessions.
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
		fetchRecents();
	}, [isVisible]);

	const trimmedSearch = search.trim().toLowerCase();
	const visibleRecents = trimmedSearch
		? recents.filter(entry => entry.name.toLowerCase().includes(trimmedSearch))
		: recents;

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
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">Log exercise</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#64748B" />
				</TouchableOpacity>
			</View>

			<TextInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search your exercises"
				placeholderTextColor="#94897E"
				className={inputClass}
			/>

			<Text className="text-[10px] font-JakartaSemiBold text-[#94897E] mb-1" style={eyebrowStyle}>
				{trimmedSearch ? 'Results' : 'Recent'}
			</Text>

			{visibleRecents.length === 0 ? (
				<Text className="text-sm text-[#94897E] py-3">
					{trimmedSearch
						? 'No matches. Try a new exercise below.'
						: 'No exercises yet. Log your first one below.'}
				</Text>
			) : (
				visibleRecents.map((entry, index) => (
					<TouchableOpacity
						key={`${entry.name}|${entry.duration}`}
						onPress={() => logRecent(entry)}
						activeOpacity={0.7}
						className={`flex-row items-center justify-between py-3 ${
							index < visibleRecents.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
						}`}
					>
						<View className="flex-1 pr-3">
							<Text className="text-sm font-JakartaBold text-[#262135]" numberOfLines={1}>
								{entry.name}
							</Text>
							<Text className="text-[11px] font-JakartaSemiBold text-[#94897E] mt-0.5">
								{`${entry.duration} · ${renderCalories(entry.calories_burned)}`}
							</Text>
						</View>
						<View className="w-7 h-7 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
							<Ionicons name="add" size={16} color="#262135" />
						</View>
					</TouchableOpacity>
				))
			)}

			<View className="mt-3">{renderErrorText()}</View>
		</View>
	);

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
				<Text className="text-xl font-JakartaExtraBold text-[#262135]">New exercise</Text>
				<TouchableOpacity onPress={onClose}>
					<Ionicons name="close" size={24} color="#64748B" />
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
									className="absolute left-0 pb-1 text-sm text-[#94897E]"
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
									className="absolute left-0 pb-1 text-sm text-[#94897E]"
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
					<Text className="text-xs font-JakartaSemiBold text-[#64748B]">+ Add another</Text>
				</TouchableOpacity>
			</View>

			{renderErrorText()}

			<TouchableOpacity
				onPress={saveNew}
				disabled={isSaving}
				className={`rounded-xl py-3 mt-4 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'}`}
			>
				<Text
					className={`text-center font-JakartaSemiBold ${isSaving ? 'text-[#64748B]' : 'text-white'}`}
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
						<Ionicons name="close" size={24} color="#64748B" />
					</TouchableOpacity>
				</View>

				<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={eyebrowStyle}>
					Calories burned
				</Text>
				<View className="flex-row items-baseline">
					<Text className="font-JakartaExtraBold text-[30px] text-[#262135]">{total}</Text>
					<Text className="font-JakartaMedium text-xs text-[#94897E] ml-1">cal</Text>
				</View>

				<View className="mt-4">
					{saved.map((entry, index) => (
						<View key={index} className="flex-row items-center justify-between mt-2">
							<Text
								className="font-JakartaMedium text-xs text-[#64748B] flex-1 pr-3"
								numberOfLines={1}
							>
								{entry.name} · {entry.duration}
							</Text>
							<Text className="text-[11px] font-JakartaSemiBold text-[#94897E]">
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
					{view === 'new' && renderNew()}
					{view === 'result' && renderResult()}
				</ScrollView>

				{view !== 'new' && (
					<View
						className="px-6 pt-3 border-t-[1px] border-[#F0EBE6]"
						style={{ paddingBottom: 24 + insets.bottom }}
					>
						{view === 'list' ? (
							<TouchableOpacity
								onPress={() => {
									setError('');
									setView('new');
								}}
								className="bg-[#E3BBA1] rounded-xl py-3"
							>
								<Text className="text-white text-center font-JakartaSemiBold">New exercise</Text>
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

export default NewWorkoutModal;
