import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated';
import { fetchAPI } from '@/lib/fetch';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { elapsedSeconds, formatPrescription, type UserWorkout } from '@/lib/workoutBuilder';
import { ExerciseFrames } from '@/components/workout/ExerciseMedia';

const ACCENT = '#E3BBA1';
const BUTTON = '#D4A07E';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const BUTTON_TEXT_SHADOW = {
	textShadowColor: 'rgba(110,60,30,0.35)',
	textShadowOffset: { width: 0, height: 1 },
	textShadowRadius: 2,
};

const formatElapsed = (seconds: number) => {
	const m = Math.floor(seconds / 60);
	return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
};

// Small "live" dot that softly pulses
const LiveDot = () => {
	const pulse = useSharedValue(0);
	useEffect(() => {
		pulse.value = withRepeat(
			withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }),
			-1
		);
	}, []);
	const ring = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + pulse.value * 1.4 }],
		opacity: 0.5 * (1 - pulse.value),
	}));
	return (
		<View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
			<Animated.View
				style={[
					{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: BUTTON },
					ring,
				]}
			/>
			<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BUTTON }} />
		</View>
	);
};

// The workout the user started and hasn't finished: where they are, how far along,
// and Resume (opens the workout page). Loads the full workout so it can show the current exercise.
const InProgressWorkoutCard = ({ workoutId, title }: { workoutId: number; title: string }) => {
	const { user } = useUser();
	const [workout, setWorkout] = useState<UserWorkout | null>(null);

	const load = useCallback(() => {
		if (!user?.id) return;
		fetchAPI(`/api/user-workouts?clerkId=${user.id}&id=${workoutId}`, { method: 'GET' })
			.then(response => response.success && setWorkout(response.data))
			.catch(err => console.error('Load in-progress workout error:', err));
	}, [user?.id, workoutId]);

	useRefetchOnFocus(load, `${user?.id}|${workoutId}`);

	const sets = workout?.progress?.sets ?? {};
	const blocks = workout?.blocks ?? [];
	const totalSets = blocks.reduce((sum, b) => sum + b.sets, 0);
	const doneSets = Object.values(sets).reduce(
		(sum, list) => sum + (list ?? []).filter(s => s?.done).length,
		0
	);
	const isFinished = (i: number) =>
		(sets[i] ?? []).filter(s => s?.done).length >= (blocks[i]?.sets ?? 0);
	const exercisesDone = blocks.filter((_, i) => isFinished(i)).length;

	// Where Resume lands: the saved position, or the next unfinished exercise after it
	const saved = Math.min(workout?.progress?.index ?? 0, Math.max(blocks.length - 1, 0));
	let current = saved;
	if (blocks.length && isFinished(saved)) {
		const next = blocks.findIndex((_, i) => i > saved && !isFinished(i));
		current = next === -1 ? saved : next;
	}
	const currentBlock = blocks[current];
	const currentExercise = currentBlock ? workout?.exercises[currentBlock.slug] : undefined;
	const pct = totalSets ? Math.min(1, doneSets / totalSets) : 0;

	return (
		<View className="rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden mb-3">
			<LinearGradient
				colors={[`${ACCENT}55`, '#FFFFFF']}
				start={{ x: 0, y: 0 }}
				end={{ x: 0.5, y: 1 }}
				style={{ padding: 16 }}
			>
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center">
						<LiveDot />
						<Text
							className="ml-2 text-[11px] font-JakartaBold text-[#B07F62]"
							style={EYEBROW_STYLE}
						>
							In progress
						</Text>
					</View>
					{workout && elapsedSeconds(workout.progress) > 0 ? (
						<View className="flex-row items-center">
							<Ionicons name="time-outline" size={12} color="#574F47" />
							<Text className="ml-1 text-[11px] font-JakartaSemiBold text-[#574F47]">
								{formatElapsed(elapsedSeconds(workout.progress))} so far
							</Text>
						</View>
					) : null}
				</View>

				<Text className="font-JakartaExtraBold text-[18px] text-[#262135] mt-2" numberOfLines={2}>
					{title}
				</Text>

				{/* Where you are */}
				{currentBlock && (
					<View className="flex-row items-center bg-white rounded-2xl border-[1px] border-[#F0EBE6] p-2.5 mt-3">
						<ExerciseFrames images={currentExercise?.images || []} size={48} animate={false} />
						<View className="flex-1 ml-3">
							<Text
								className="text-[10px] font-JakartaSemiBold text-[#574F47]"
								style={EYEBROW_STYLE}
							>
								{doneSets === 0 ? 'First up' : 'Up next'} · {current + 1} of {blocks.length}
							</Text>
							<Text className="font-JakartaBold text-[14px] text-[#262135]" numberOfLines={1}>
								{currentExercise?.name ?? currentBlock.slug}
							</Text>
							<Text className="font-JakartaMedium text-[12px] text-[#574F47]">
								{formatPrescription(currentBlock)}
							</Text>
						</View>
					</View>
				)}

				{/* Progress through the sets */}
				<View className="mt-3.5">
					<View className="h-1.5 rounded-full bg-[#F1E9DE] overflow-hidden">
						<View
							style={{
								width: `${pct * 100}%`,
								height: '100%',
								borderRadius: 999,
								backgroundColor: BUTTON,
							}}
						/>
					</View>
					<View className="flex-row justify-between mt-1.5">
						<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]">
							{doneSets}/{totalSets || '–'} sets
						</Text>
						<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]">
							{exercisesDone}/{blocks.length || '–'} exercises
						</Text>
					</View>
				</View>

				{/* Opens the workout page (exercise list) — Resume / reorder from there */}
				<View className="flex-row mt-4">
					<TouchableOpacity
						onPress={() => router.push(`/training/${workoutId}`)}
						className="flex-1 flex-row items-center justify-center rounded-xl py-3"
						style={{ backgroundColor: '#262135' }}
					>
						<Ionicons name="play" size={16} color="#FFFFFF" />
						<Text
							className="text-white font-JakartaBold text-[15px] ml-1.5"
							style={BUTTON_TEXT_SHADOW}
						>
							Resume
						</Text>
					</TouchableOpacity>
				</View>
			</LinearGradient>
		</View>
	);
};

export default InProgressWorkoutCard;
