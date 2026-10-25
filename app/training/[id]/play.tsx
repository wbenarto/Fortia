import { useCallback, useEffect, useRef, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	TextInput,
	Alert,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fetchAPI } from '@/lib/fetch';
import { SCREEN_BG } from '@/lib/theme';
import { getTodayDate } from '@/lib/dateUtils';
import { useUserProfile } from '@/lib/userUtils';
import { toDisplayWeight, toStoredWeight, useUnitSystem, weightUnit } from '@/lib/units';
import {
	SECTION_LABELS,
	capitalize,
	estimateWorkoutCalories,
	formatPrescription,
	formatSeconds,
	type SetProgress,
	type UserWorkout,
	type WorkoutBlock,
} from '@/lib/workoutBuilder';
import {
	ExerciseFrames,
	InstructionSteps,
	WatchDemoButton,
} from '@/components/workout/ExerciseMedia';
import RestTimer from '@/components/workout/RestTimer';

const INK = '#262135';
const ACCENT = '#E3BBA1';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
// Equipment that doesn't mean "add a weight to the set"
const UNWEIGHTED = new Set(['pull_up_bar', 'bench', 'foam_roll', 'cardio_machine']);

const defaultSets = (block: WorkoutBlock): SetProgress[] =>
	Array.from({ length: block.sets }, () => ({ reps: block.reps, weight: null, done: false }));

// Guided player: one exercise at a time, set check-offs, rest timer, then save the
// finished workout to activity (which feeds calories out).
const TrainingPlayer = () => {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const unitSystem = useUnitSystem();
	const profile = useUserProfile();

	const [workout, setWorkout] = useState<UserWorkout | null>(null);
	const [index, setIndex] = useState(0);
	const [sets, setSets] = useState<Record<string, SetProgress[]>>({});
	const [activeSeconds, setActiveSeconds] = useState(0);
	const [paused, setPaused] = useState(false);
	const [now, setNow] = useState(Date.now());
	const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
	const [timed, setTimed] = useState<{ set: number; endsAt: number } | null>(null);
	const [phase, setPhase] = useState<'exercise' | 'finish'>('exercise');
	const [showSteps, setShowSteps] = useState(false);
	const [calories, setCalories] = useState('');
	const [isSaving, setIsSaving] = useState(false);

	// Latest progress for saves fired from timers / unmount
	const progressRef = useRef({ sets, activeSeconds, index });
	progressRef.current = { sets, activeSeconds, index };
	const pausedRef = useRef(paused);
	pausedRef.current = paused;
	const completedRef = useRef(false);

	// Load once; resume where the user left off
	useEffect(() => {
		if (!user?.id || !id) return;
		fetchAPI(`/api/user-workouts?clerkId=${user.id}&id=${id}`, { method: 'GET' })
			.then(response => {
				if (!response.success) return;
				const data: UserWorkout = response.data;
				if (data.status === 'completed') {
					router.back();
					return;
				}
				setWorkout(data);
				setSets(data.progress?.sets || {});
				setActiveSeconds(data.progress?.activeSeconds || 0);
				setIndex(Math.min(data.progress?.index || 0, data.blocks.length - 1));
				if (data.status === 'planned') {
					fetchAPI(`/api/user-workouts?id=${data.id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ clerkId: user.id, status: 'in_progress' }),
					}).catch(() => {});
				}
			})
			.catch(err => console.error('Load workout error:', err));
	}, [user?.id, id]);

	const saveProgress = useCallback(() => {
		if (!workout || !user?.id || completedRef.current) return Promise.resolve();
		return fetchAPI(`/api/user-workouts?id=${workout.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ clerkId: user.id, progress: progressRef.current }),
		}).catch(err => console.error('Save progress error:', err));
	}, [workout, user?.id]);

	// Debounced save whenever sets or position change, plus once on leave
	useEffect(() => {
		if (!workout) return;
		const timer = setTimeout(saveProgress, 1200);
		return () => clearTimeout(timer);
	}, [sets, index, workout, saveProgress]);
	useEffect(() => () => void saveProgress(), [saveProgress]);

	// One clock for the player: active time (unless paused), rest and timed sets
	useEffect(() => {
		if (!workout || phase !== 'exercise') return;
		const timer = setInterval(() => {
			setNow(Date.now());
			if (!pausedRef.current) setActiveSeconds(s => s + 1);
		}, 1000);
		return () => clearInterval(timer);
	}, [workout, phase]);

	const block = workout?.blocks[index];
	const exercise = block ? workout?.exercises[block.slug] : undefined;
	const blockSets = block ? sets[index] || defaultSets(block) : [];

	const updateSet = (setIndex: number, patch: Partial<SetProgress>) => {
		if (!block) return;
		setSets(prev => {
			const list = [...(prev[index] || defaultSets(block))];
			list[setIndex] = { ...list[setIndex], ...patch };
			return { ...prev, [index]: list };
		});
	};

	const completeSet = useCallback(
		(setIndex: number) => {
			if (!block) return;
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
			const list = [...(sets[index] || defaultSets(block))];
			list[setIndex] = { ...list[setIndex], done: true };
			setSets(prev => ({ ...prev, [index]: list }));
			const remaining = list.filter(s => !s.done).length;
			if (remaining > 0 && block.rest > 0) {
				setRest({ endsAt: Date.now() + block.rest * 1000, total: block.rest });
			}
		},
		[block, index, sets]
	);

	// Rest / timed-set expiry
	useEffect(() => {
		if (rest && now >= rest.endsAt) {
			setRest(null);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		}
		if (timed && now >= timed.endsAt) {
			const set = timed.set;
			setTimed(null);
			completeSet(set);
		}
	}, [now, rest, timed, completeSet]);

	const toggleSet = (setIndex: number) => {
		if (blockSets[setIndex]?.done) updateSet(setIndex, { done: false });
		else completeSet(setIndex);
	};

	const goTo = (next: number) => {
		if (!workout) return;
		setRest(null);
		setTimed(null);
		setShowSteps(false);
		if (next >= workout.blocks.length) {
			const minutes = activeMinutesFor(workout, activeSeconds);
			setCalories(
				String(
					estimateWorkoutCalories(workout.inputs.style, Number(profile.weight) || 160, minutes)
				)
			);
			setPhase('finish');
			return;
		}
		setIndex(Math.max(0, next));
	};

	const close = async () => {
		await saveProgress();
		router.back();
	};

	const finish = async () => {
		if (!workout || !user?.id) return;
		setIsSaving(true);
		try {
			const response = await fetchAPI(`/api/user-workouts?id=${workout.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					status: 'completed',
					activeMinutes: activeMinutesFor(workout, activeSeconds),
					calories: calories.trim() === '' ? null : Number(calories),
					date: getTodayDate(),
					progress: progressRef.current,
				}),
			});
			if (!response.success) {
				Alert.alert('Could not save workout', response.error || 'Please try again.');
				return;
			}
			completedRef.current = true;
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
			router.back();
		} catch (err) {
			console.error('Finish workout error:', err);
			Alert.alert('Could not save workout', 'Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	if (!workout || !block) {
		return (
			<View className="flex-1 items-center justify-center" style={{ backgroundColor: SCREEN_BG }}>
				<Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
				<ActivityIndicator color={ACCENT} />
			</View>
		);
	}

	const total = workout.blocks.length;
	const isLast = index === total - 1;
	const allDone = blockSets.every(s => s.done);
	const weighted = block.reps !== null && (exercise?.equipment || []).some(e => !UNWEIGHTED.has(e));
	const nextBlock = workout.blocks[index + 1];
	const nextName = nextBlock
		? workout.exercises[nextBlock.slug]?.name || 'Next exercise'
		: 'Finish';

	if (phase === 'finish') {
		const doneSets = Object.values(sets)
			.flat()
			.filter(s => s.done).length;
		const totalSets = workout.blocks.reduce((sum, b) => sum + b.sets, 0);
		return (
			<>
				<Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
				<View
					className="flex-1 px-5"
					style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top + 40 }}
				>
					<View className="items-center">
						<View className="w-16 h-16 rounded-full bg-[#7DB88A26] items-center justify-center">
							<Ionicons name="trophy" size={30} color="#7DB88A" />
						</View>
						<Text className="font-JakartaExtraBold text-[26px] text-[#262135] mt-4">
							Workout done
						</Text>
						<Text className="font-JakartaMedium text-sm text-[#94897E] mt-1 text-center">
							{workout.title}
						</Text>
					</View>

					<View className="flex-row bg-white rounded-3xl border-[1px] border-[#F0EBE6] px-5 py-4 mt-8 justify-between">
						<Stat label="Active" value={`${activeMinutesFor(workout, activeSeconds)}`} unit="min" />
						<Stat label="Sets" value={`${doneSets}/${totalSets}`} />
						<View>
							<Text
								className="text-[10px] font-JakartaSemiBold text-[#94897E]"
								style={EYEBROW_STYLE}
							>
								Burned
							</Text>
							<View className="flex-row items-baseline mt-0.5">
								<TextInput
									value={calories}
									onChangeText={text => setCalories(text.replace(/[^0-9]/g, ''))}
									keyboardType="number-pad"
									className="font-JakartaExtraBold text-[22px] text-[#262135] border-b-[1px] border-[#E3BBA1] min-w-[48px] p-0"
								/>
								<Text className="font-JakartaMedium text-[11px] text-[#94897E] ml-1">kcal</Text>
							</View>
						</View>
					</View>
					<Text className="text-xs font-JakartaMedium text-[#94897E] mt-3 ml-1">
						Estimated from your weight and active time. Tap to adjust — it's added to your calories
						out.
					</Text>

					<View className="flex-1" />
					<View style={{ paddingBottom: 16 + insets.bottom, rowGap: 10 }}>
						<TouchableOpacity
							onPress={finish}
							disabled={isSaving}
							className={`rounded-xl py-3.5 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'}`}
						>
							{isSaving ? (
								<ActivityIndicator size="small" color={ACCENT} />
							) : (
								<Text className="text-white text-center font-JakartaSemiBold">
									Save to activity
								</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setPhase('exercise')}
							disabled={isSaving}
							className="bg-[#F1F1F1] rounded-xl py-3.5"
						>
							<Text className="text-[#262135] text-center font-JakartaSemiBold">
								Back to workout
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				{/* Header */}
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel="Close workout">
						<Ionicons name="close" size={26} color={INK} />
					</TouchableOpacity>
					<View className="items-center">
						<Text className="font-JakartaSemiBold text-[#262135] text-base">
							{index + 1} / {total}
						</Text>
						<Text className="font-JakartaMedium text-[11px] text-[#94897E]">
							{SECTION_LABELS[block.section]} · {formatClock(activeSeconds)}
							{paused ? ' · paused' : ''}
						</Text>
					</View>
					<TouchableOpacity
						onPress={() => setPaused(p => !p)}
						hitSlop={10}
						accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}
					>
						<Ionicons name={paused ? 'play' : 'pause'} size={22} color={INK} />
					</TouchableOpacity>
				</View>
				<View className="h-1 mx-5 rounded-full bg-[#F0EBE6] overflow-hidden">
					<View
						className="h-full rounded-full bg-[#E3BBA1]"
						style={{ width: `${((index + (allDone ? 1 : 0)) / total) * 100}%` }}
					/>
				</View>

				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 }}
					showsVerticalScrollIndicator={false}
				>
					<ExerciseFrames images={exercise?.images || []} height={220} />
					<Text className="font-JakartaExtraBold text-[22px] text-[#262135] mt-4">
						{exercise?.name || block.slug}
					</Text>
					<View className="flex-row items-center justify-between mt-1">
						<Text className="flex-1 font-JakartaMedium text-xs text-[#94897E] pr-3">
							{formatPrescription(block)}
							{exercise?.primary_muscles.length
								? ` · ${exercise.primary_muscles.map(capitalize).join(', ')}`
								: ''}
						</Text>
						{exercise && <WatchDemoButton exerciseName={exercise.name} />}
					</View>

					{/* Sets */}
					<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] mt-5 overflow-hidden">
						{blockSets.map((set, setIndex) => {
							const running = timed?.set === setIndex;
							const secondsLeft = running
								? Math.max(0, Math.ceil((timed.endsAt - now) / 1000))
								: block.seconds || 0;
							return (
								<View
									key={setIndex}
									className={`flex-row items-center px-4 py-3 ${
										setIndex < blockSets.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
									}`}
									style={{ opacity: set.done ? 0.6 : 1 }}
								>
									<Text className="w-12 font-JakartaSemiBold text-xs text-[#94897E]">
										Set {setIndex + 1}
									</Text>

									{block.reps !== null ? (
										<View className="flex-row items-center flex-1">
											<Stepper
												value={set.reps ?? block.reps}
												onChange={reps => updateSet(setIndex, { reps })}
												suffix="reps"
											/>
											{weighted && (
												<View className="flex-row items-baseline ml-3">
													<TextInput
														key={`${index}-${setIndex}-${unitSystem}`}
														defaultValue={
															set.weight != null
																? String(
																		Math.round(toDisplayWeight(set.weight, unitSystem) * 2) / 2
																	)
																: ''
														}
														placeholder="—"
														placeholderTextColor="#C9BEB4"
														keyboardType="decimal-pad"
														onEndEditing={e => {
															const value = parseFloat(e.nativeEvent.text);
															updateSet(setIndex, {
																weight: Number.isFinite(value)
																	? Math.round(toStoredWeight(value, unitSystem) * 10) / 10
																	: null,
															});
														}}
														className="w-14 text-center font-JakartaBold text-sm text-[#262135] border-b-[1px] border-[#F0EBE6] p-0 pb-1"
													/>
													<Text className="text-[11px] font-JakartaMedium text-[#94897E] ml-1">
														{weightUnit(unitSystem)}
													</Text>
												</View>
											)}
										</View>
									) : (
										<View className="flex-row items-center flex-1">
											<Text className="font-JakartaBold text-sm text-[#262135]">
												{formatSeconds(secondsLeft)}
											</Text>
											{!set.done && (
												<TouchableOpacity
													onPress={() =>
														running
															? setTimed(null)
															: setTimed({
																	set: setIndex,
																	endsAt: Date.now() + (block.seconds || 0) * 1000,
																})
													}
													className="flex-row items-center bg-[#F1F1F1] rounded-full px-3 py-1 ml-3"
												>
													<Ionicons name={running ? 'stop' : 'play'} size={12} color={INK} />
													<Text className="text-xs font-JakartaSemiBold text-[#262135] ml-1">
														{running ? 'Stop' : 'Start'}
													</Text>
												</TouchableOpacity>
											)}
										</View>
									)}

									<TouchableOpacity
										onPress={() => toggleSet(setIndex)}
										hitSlop={8}
										accessibilityLabel={set.done ? 'Mark set not done' : 'Mark set done'}
									>
										<Ionicons
											name={set.done ? 'checkmark-circle' : 'ellipse-outline'}
											size={28}
											color={set.done ? '#7DB88A' : '#C9BEB4'}
										/>
									</TouchableOpacity>
								</View>
							);
						})}
					</View>
					{block.rest > 0 && blockSets.length > 1 && (
						<Text className="text-xs font-JakartaMedium text-[#94897E] mt-2 ml-1">
							Rest {formatSeconds(block.rest)} between sets — the timer starts when you check a set.
						</Text>
					)}

					{/* How to */}
					{exercise && exercise.instructions.length > 0 && (
						<View className="mt-6">
							<TouchableOpacity
								onPress={() => setShowSteps(s => !s)}
								className="flex-row items-center justify-between mb-3"
							>
								<Text
									className="text-[11px] font-JakartaSemiBold text-[#94897E] ml-1"
									style={EYEBROW_STYLE}
								>
									How to do it
								</Text>
								<Ionicons
									name={showSteps ? 'chevron-up' : 'chevron-down'}
									size={16}
									color="#94897E"
								/>
							</TouchableOpacity>
							{showSteps && <InstructionSteps steps={exercise.instructions} />}
						</View>
					)}
				</ScrollView>

				{/* Prev / next */}
				<View
					className="absolute left-0 right-0 bottom-0 flex-row px-5 pt-3"
					style={{ paddingBottom: 16 + insets.bottom, columnGap: 12, backgroundColor: SCREEN_BG }}
				>
					<TouchableOpacity
						onPress={() => goTo(index - 1)}
						disabled={index === 0}
						className="bg-[#F1F1F1] rounded-xl py-3.5 px-5"
						style={{ opacity: index === 0 ? 0.4 : 1 }}
						accessibilityLabel="Previous exercise"
					>
						<Ionicons name="chevron-back" size={20} color={INK} />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => goTo(index + 1)}
						className="flex-1 rounded-xl py-3.5"
						style={{ backgroundColor: allDone || isLast ? ACCENT : '#E3BBA1B3' }}
					>
						<Text className="text-white text-center font-JakartaSemiBold">
							{isLast ? 'Finish workout' : allDone ? 'Next exercise' : 'Skip to next'}
						</Text>
					</TouchableOpacity>
				</View>

				{rest && (
					<RestTimer
						remaining={Math.max(0, Math.ceil((rest.endsAt - now) / 1000))}
						total={rest.total}
						nextLabel={`Set ${blockSets.findIndex(s => !s.done) + 1} of ${exercise?.name || ''}`}
						onAdd={() => setRest(r => (r ? { endsAt: r.endsAt + 15000, total: r.total + 15 } : r))}
						onSkip={() => setRest(null)}
						bottomInset={insets.bottom}
					/>
				)}
			</View>
		</>
	);
};

// Active minutes sent with the finished workout: at least 1, and capped at 1.5× the
// planned duration so a forgotten timer can't inflate calories out.
const activeMinutesFor = (workout: UserWorkout, seconds: number) =>
	Math.max(1, Math.min(Math.round(seconds / 60), Math.round(workout.inputs.duration * 1.5)));

const formatClock = (seconds: number) =>
	`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const Stepper = ({
	value,
	onChange,
	suffix,
}: {
	value: number;
	onChange: (value: number) => void;
	suffix: string;
}) => (
	<View className="flex-row items-center">
		<TouchableOpacity
			onPress={() => onChange(Math.max(1, value - 1))}
			hitSlop={6}
			className="w-7 h-7 rounded-full bg-[#F1F1F1] items-center justify-center"
		>
			<Ionicons name="remove" size={14} color={INK} />
		</TouchableOpacity>
		<Text className="font-JakartaBold text-sm text-[#262135] mx-2 min-w-[18px] text-center">
			{value}
		</Text>
		<TouchableOpacity
			onPress={() => onChange(Math.min(50, value + 1))}
			hitSlop={6}
			className="w-7 h-7 rounded-full bg-[#F1F1F1] items-center justify-center"
		>
			<Ionicons name="add" size={14} color={INK} />
		</TouchableOpacity>
		<Text className="font-JakartaMedium text-[11px] text-[#94897E] ml-1.5">{suffix}</Text>
	</View>
);

const Stat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
	<View>
		<Text className="text-[10px] font-JakartaSemiBold text-[#94897E]" style={EYEBROW_STYLE}>
			{label}
		</Text>
		<View className="flex-row items-baseline mt-0.5">
			<Text className="font-JakartaExtraBold text-[22px] text-[#262135]">{value}</Text>
			{unit && <Text className="font-JakartaMedium text-[11px] text-[#94897E] ml-1">{unit}</Text>}
		</View>
	</View>
);

export default TrainingPlayer;
