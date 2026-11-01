import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import {
	SECTION_LABELS,
	equipmentFor,
	formatPrescription,
	loadBuilderPrefs,
	type LibraryExercise,
	type Section,
	type UserWorkout,
	type WorkoutBlock,
} from '@/lib/workoutBuilder';

const ACCENT = '#E3BBA1';
const INK = '#262135';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

interface Suggestion {
	inputs: UserWorkout['inputs'];
	title: string;
	reason: string;
	kind: 'strength' | 'cardio' | 'recovery' | 'starter';
}

interface SuggestionData {
	suggestions: Suggestion[];
	inProgress: { id: number; title: string } | null;
	completedToday: { id: number; title: string; calories: number | null } | null;
}

const KIND_ICON: Record<Suggestion['kind'], keyof typeof Ionicons.glyphMap> = {
	strength: 'barbell-outline',
	cardio: 'heart-outline',
	recovery: 'leaf-outline',
	starter: 'sparkles-outline',
};

const LOCATION_LABEL: Record<string, string> = { gym: 'Gym', home: 'Home', anywhere: 'Anywhere' };

// The exercises behind a suggestion — POST /api/workout-builder with preview: true
// (cache-first, creates no workout). Start then uses the same template.
interface Preview {
	templateId: number;
	est_minutes: number;
	blocks: WorkoutBlock[];
	exercises: Record<string, LibraryExercise>;
}

const SECTIONS: Section[] = ['warmup', 'main', 'cooldown'];
const previewKey = (inputs: Suggestion['inputs']) => JSON.stringify(inputs);

// "Something else" position, remembered for the day so the card doesn't jump back
const indexKey = (date: string) => `workout-suggestion-index-${date}`;

// Today's suggested workout, from GET /api/workout-suggestion (history-based, no AI).
// The workout is only built when the user taps Start.
const TodayWorkoutCard = () => {
	const { user } = useUser();
	const [data, setData] = useState<SuggestionData | null>(null);
	const [index, setIndex] = useState(0);
	const [starting, setStarting] = useState(false);
	const [showAnother, setShowAnother] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [previews, setPreviews] = useState<Record<string, Preview>>({});
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState('');

	const fetchSuggestion = useCallback(() => {
		if (!user?.id) return;
		const date = getTodayDate();
		(async () => {
			try {
				const prefs = await loadBuilderPrefs();
				const params = new URLSearchParams({
					clerkId: user.id,
					date,
					location: prefs.location,
					equipment: equipmentFor(prefs).join(','),
				});
				const [response, saved] = await Promise.all([
					fetchAPI(`/api/workout-suggestion?${params}`, { method: 'GET' }),
					AsyncStorage.getItem(indexKey(date)).catch(() => null),
				]);
				if (response.success) {
					setData(response.data);
					setIndex(Number(saved) || 0);
				}
			} catch (err) {
				console.error('Load workout suggestion error:', err);
			}
		})();
	}, [user?.id]);

	useRefetchOnFocus(fetchSuggestion, `${user?.id}`);

	if (!data || data.suggestions.length === 0) return null;

	const suggestion = data.suggestions[index % data.suggestions.length];

	const preview = previews[previewKey(suggestion.inputs)];

	const somethingElse = () => {
		const next = (index + 1) % data.suggestions.length;
		setIndex(next);
		setExpanded(false);
		setPreviewError('');
		AsyncStorage.setItem(indexKey(getTodayDate()), String(next)).catch(() => {});
	};

	const toggleExpanded = async () => {
		const opening = !expanded;
		setExpanded(opening);
		if (!opening || preview || !user?.id) return;
		const key = previewKey(suggestion.inputs);
		setPreviewLoading(true);
		setPreviewError('');
		try {
			const response = await fetchAPI('/api/workout-builder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clerkId: user.id, ...suggestion.inputs, preview: true }),
			});
			if (response.success) setPreviews(prev => ({ ...prev, [key]: response.data }));
			else setPreviewError(response.error || 'Could not load the exercises.');
		} catch {
			setPreviewError('Could not load the exercises.');
		} finally {
			setPreviewLoading(false);
		}
	};

	const start = async () => {
		if (!user?.id) return;
		setStarting(true);
		try {
			const response = await fetchAPI('/api/workout-builder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				// Same template as the expanded list, so Start gives what was shown
				body: JSON.stringify({
					clerkId: user.id,
					...suggestion.inputs,
					...(preview ? { templateId: preview.templateId } : {}),
				}),
			});
			if (response.success) router.push(`/training/${response.data.id}`);
			else Alert.alert('Could not build this workout', response.error || 'Please try again.');
		} catch {
			Alert.alert('Could not build this workout', 'Please try again.');
		} finally {
			setStarting(false);
		}
	};

	if (data.inProgress) {
		return (
			<StatusCard
				icon="play"
				tint={ACCENT}
				eyebrow="In progress"
				title={data.inProgress.title}
				action="Resume"
				onPress={() => router.push(`/training/${data.inProgress!.id}/play`)}
			/>
		);
	}

	if (data.completedToday && !showAnother) {
		return (
			<StatusCard
				icon="checkmark"
				tint="#7DB88A"
				eyebrow="Today's workout done"
				title={data.completedToday.title}
				subtitle={
					data.completedToday.calories != null
						? `${data.completedToday.calories} kcal burned`
						: undefined
				}
				action="Another?"
				onPress={() => setShowAnother(true)}
			/>
		);
	}

	return (
		<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mb-3">
			<View className="flex-row items-center justify-between">
				<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
					Today's recommended workout
				</Text>
				<View className="flex-row items-center">
					<Ionicons name="time-outline" size={12} color="#574F47" />
					<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] ml-1">
						{suggestion.inputs.duration} min · {LOCATION_LABEL[suggestion.inputs.location]}
					</Text>
				</View>
			</View>

			{/* Tap the title row to show / hide the exercises */}
			<TouchableOpacity
				onPress={toggleExpanded}
				activeOpacity={0.7}
				className="flex-row items-center mt-3"
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityHint="Shows the exercises in this workout"
			>
				<View
					className="w-11 h-11 rounded-full items-center justify-center"
					style={{ backgroundColor: `${ACCENT}33` }}
				>
					<Ionicons name={KIND_ICON[suggestion.kind]} size={20} color="#B07F62" />
				</View>
				<View className="flex-1 ml-3 mr-2">
					<Text className="font-JakartaExtraBold text-[17px] text-[#262135]" numberOfLines={2}>
						{suggestion.title}
					</Text>
					<Text className="font-JakartaMedium text-[13px] text-[#3D3630] mt-0.5">
						{suggestion.reason}
					</Text>
				</View>
				<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={INK} />
			</TouchableOpacity>

			{expanded && (
				<View className="mt-3 rounded-2xl bg-[#F9F6F2] px-3.5 py-2">
					{previewLoading ? (
						<View className="py-4 items-center">
							<ActivityIndicator color={ACCENT} />
						</View>
					) : previewError ? (
						<Text className="font-JakartaMedium text-[13px] text-[#3D3630] py-2">
							{previewError}
						</Text>
					) : preview ? (
						SECTIONS.map(section => {
							const blocks = preview.blocks.filter(b => b.section === section);
							if (!blocks.length) return null;
							return (
								<View key={section} className="py-1.5">
									<Text
										className="text-[11px] font-JakartaBold text-[#B07F62] mb-1"
										style={EYEBROW_STYLE}
									>
										{SECTION_LABELS[section]}
									</Text>
									{blocks.map((block, i) => (
										<View key={`${block.slug}-${i}`} className="flex-row items-center py-1.5">
											<Text
												className="flex-1 font-JakartaSemiBold text-[14px] text-[#262135] mr-3"
												numberOfLines={1}
											>
												{preview.exercises[block.slug]?.name ?? block.slug}
											</Text>
											<Text className="font-JakartaBold text-[13px] text-[#262135]">
												{formatPrescription(block)}
											</Text>
										</View>
									))}
								</View>
							);
						})
					) : null}
				</View>
			)}

			<View className="flex-row mt-4" style={{ columnGap: 10 }}>
				<TouchableOpacity
					onPress={somethingElse}
					disabled={starting || data.suggestions.length < 2}
					className="flex-row items-center justify-center bg-[#F1F1F1] rounded-xl py-3 px-4"
					style={{ opacity: data.suggestions.length < 2 ? 0.5 : 1 }}
					accessibilityLabel="Suggest something else"
				>
					<Ionicons name="shuffle" size={16} color={INK} />
					<Text className="text-[#262135] font-JakartaSemiBold text-[13px] ml-1.5">
						Something else
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={start}
					disabled={starting}
					className="flex-1 bg-[#E3BBA1] rounded-xl py-3 items-center justify-center"
				>
					{starting ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Text className="text-white font-JakartaSemiBold text-[13px]">Start</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
};

const StatusCard = ({
	icon,
	tint,
	eyebrow,
	title,
	subtitle,
	action,
	onPress,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	tint: string;
	eyebrow: string;
	title: string;
	subtitle?: string;
	action: string;
	onPress: () => void;
}) => (
	<TouchableOpacity
		activeOpacity={0.85}
		onPress={onPress}
		className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mb-3 flex-row items-center"
	>
		<View
			className="w-11 h-11 rounded-full items-center justify-center"
			style={{ backgroundColor: `${tint}26` }}
		>
			<Ionicons name={icon} size={20} color={tint} />
		</View>
		<View className="flex-1 mx-3">
			<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
				{eyebrow}
			</Text>
			<Text className="font-JakartaBold text-[15px] text-[#262135] mt-0.5" numberOfLines={1}>
				{title}
			</Text>
			{subtitle ? (
				<Text className="font-JakartaMedium text-xs text-[#574F47] mt-0.5">{subtitle}</Text>
			) : null}
		</View>
		<Text className="font-JakartaSemiBold text-[13px]" style={{ color: '#B07F62' }}>
			{action}
		</Text>
	</TouchableOpacity>
);

export default TodayWorkoutCard;
