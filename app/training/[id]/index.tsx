import { useCallback, useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	StyleSheet,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeModal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import {
	NestableDraggableFlatList,
	NestableScrollContainer,
	ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { fetchAPI } from '@/lib/fetch';
import { SCREEN_BG } from '@/lib/theme';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import {
	EQUIPMENT_LABELS,
	SECTION_LABELS,
	STYLE_OPTIONS,
	capitalize,
	elapsedSeconds,
	formatPrescription,
	type LibraryExercise,
	type Section,
	type UserWorkout,
	type WorkoutBlock,
	type SetProgress,
} from '@/lib/workoutBuilder';
import {
	ExerciseFrames,
	InstructionSteps,
	WatchDemoButton,
} from '@/components/workout/ExerciseMedia';

const INK = '#262135';
const ACCENT = '#E3BBA1';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const SECTIONS: Section[] = ['warmup', 'main', 'cooldown'];
const BUTTON_TEXT_SHADOW = {
	textShadowColor: 'rgba(110,60,30,0.35)',
	textShadowOffset: { width: 0, height: 1 },
	textShadowRadius: 2,
};

const formatClock = (seconds: number) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const sec = String(seconds % 60).padStart(2, '0');
	return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

type Alternative = Pick<LibraryExercise, 'slug' | 'name' | 'primary_muscles' | 'images'>;

// Workout plan: review the exercises, swap/remove any, shuffle, then start.
const TrainingPlan = () => {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [workout, setWorkout] = useState<UserWorkout | null>(null);
	const [loadError, setLoadError] = useState('');
	const [busy, setBusy] = useState<'shuffle' | 'save' | null>(null);
	const [detailIndex, setDetailIndex] = useState<number | null>(null);
	const [swapIndex, setSwapIndex] = useState<number | null>(null);
	const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);

	const fetchWorkout = useCallback(() => {
		if (!user?.id || !id) return;
		fetchAPI(`/api/user-workouts?clerkId=${user.id}&id=${id}`, { method: 'GET' })
			.then(response => {
				if (response.success) setWorkout(response.data);
				else setLoadError(response.error || 'Workout not found');
			})
			.catch(() => setLoadError('Could not load this workout'));
	}, [user?.id, id]);

	useRefetchOnFocus(fetchWorkout, `${user?.id}|${id}`);

	// Swap / remove only before starting; reordering works mid-workout too (progress moves with it)
	// Live workout clock while in progress (keeps counting off the player screen)
	const [now, setNow] = useState(Date.now());
	const running = workout?.status === 'in_progress';
	useEffect(() => {
		if (!running) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [running]);

	const editable = workout?.status === 'planned';
	const reorderable = workout?.status === 'planned' || workout?.status === 'in_progress';

	// Sets done for one exercise, from the player's saved progress (keyed by block index)
	const exerciseProgress = (index: number, block: WorkoutBlock) => {
		const total = block.sets;
		if (workout?.status === 'completed') return { done: total, total, finished: true };
		const list = workout?.progress?.sets?.[index] ?? [];
		const done = list.filter(set => set?.done).length;
		return { done, total, finished: total > 0 && done >= total };
	};

	const rowKey = ({ block, index }: { block: WorkoutBlock; index: number }) =>
		`${block.section}-${block.slug}-${workout?.blocks.slice(0, index).filter(b => b.slug === block.slug).length}`;

	// Save a section's new order; other sections keep theirs. Optimistic, like swaps.
	// Save a section's new order; other sections keep theirs. Progress is keyed by block
	// index, so ticked sets and the player's position move with their exercise.
	const reorderSection = (section: Section, ordered: { block: WorkoutBlock; index: number }[]) => {
		if (!workout) return;
		const rows = SECTIONS.flatMap(s =>
			s === section
				? ordered
				: workout.blocks
						.map((block, index) => ({ block, index }))
						.filter(r => r.block.section === s)
		);
		const blocks = rows.map(r => r.block);
		const newIndexOf = new Map(rows.map((r, newIndex) => [r.index, newIndex]));

		const sets: Record<string, SetProgress[]> = {};
		for (const [oldIndex, list] of Object.entries(workout.progress?.sets ?? {})) {
			const moved = newIndexOf.get(Number(oldIndex));
			if (moved !== undefined) sets[moved] = list;
		}
		const oldPosition = workout.progress?.index;
		const progress = {
			...workout.progress,
			sets,
			...(oldPosition !== undefined ? { index: newIndexOf.get(oldPosition) ?? oldPosition } : {}),
		};

		setWorkout({ ...workout, blocks, progress });
		saveBlocks(blocks, workout.status === 'planned' ? undefined : progress);
	};

	const renderRow = (
		{ block, index }: { block: WorkoutBlock; index: number },
		position: number,
		count: number,
		drag?: () => void,
		isActive = false
	) => {
		if (!workout) return null;
		const exercise = workout.exercises[block.slug];
		const { done, total, finished } = exerciseProgress(index, block);
		return (
			<TouchableOpacity
				activeOpacity={0.7}
				// Jump into the player at this exercise; a finished workout
				// can't be replayed, so it shows the how-to instead
				onPress={() =>
					workout.status === 'completed'
						? setDetailIndex(index)
						: router.push(`/training/${workout.id}/play?index=${index}`)
				}
				onLongPress={drag}
				delayLongPress={250}
				disabled={isActive}
				className={`flex-row items-center px-3 py-3 bg-white ${
					position < count - 1 && !isActive ? 'border-b-[1px] border-[#F0EBE6]' : ''
				}`}
				style={
					isActive
						? {
								borderRadius: 20,
								shadowColor: '#262135',
								shadowOpacity: 0.15,
								shadowRadius: 12,
								shadowOffset: { width: 0, height: 4 },
								elevation: 6,
							}
						: undefined
				}
			>
				{drag && (
					<TouchableOpacity
						onPressIn={drag}
						hitSlop={8}
						className="pr-2"
						accessibilityLabel="Drag to reorder"
					>
						<Ionicons name="reorder-three" size={22} color={isActive ? '#B07F62' : '#C9BFB5'} />
					</TouchableOpacity>
				)}
				<View>
					<ExerciseFrames images={exercise?.images || []} size={52} animate={false} />
					{finished && (
						<View
							style={[
								StyleSheet.absoluteFillObject,
								{
									borderRadius: 16,
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: 'rgba(125,184,138,0.55)',
								},
							]}
						>
							<Ionicons name="checkmark" size={26} color="#FFFFFF" />
						</View>
					)}
				</View>
				<View className="flex-1 mx-3">
					<Text
						className="font-JakartaSemiBold text-sm"
						style={{ color: finished ? '#574F47' : INK }}
						numberOfLines={2}
					>
						{exercise?.name || block.slug}
					</Text>
					<Text className="font-JakartaMedium text-xs text-[#574F47] mt-0.5">
						{formatPrescription(block)}
						{block.section === 'main' && block.rest ? ` · rest ${block.rest}s` : ''}
						{exercise?.primary_muscles[0] ? ` · ${capitalize(exercise.primary_muscles[0])}` : ''}
					</Text>
				</View>
				{finished ? (
					<Ionicons name="checkmark-circle" size={24} color="#7DB88A" />
				) : done > 0 ? (
					<Text className="font-JakartaBold text-xs text-[#B07F62]">
						{done}/{total} sets
					</Text>
				) : !editable ? (
					<Ionicons name="chevron-forward" size={18} color="#857869" />
				) : null}
				{editable && (
					<>
						<TouchableOpacity
							onPress={() => openSwap(index)}
							hitSlop={8}
							className="p-1.5"
							accessibilityLabel="Swap exercise"
						>
							<Ionicons name="swap-horizontal" size={18} color="#574F47" />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => removeBlock(index)}
							hitSlop={8}
							className="p-1.5"
							accessibilityLabel="Remove exercise"
						>
							<Ionicons name="close" size={18} color="#857869" />
						</TouchableOpacity>
					</>
				)}
			</TouchableOpacity>
		);
	};

	const saveBlocks = async (blocks: WorkoutBlock[], progress?: UserWorkout['progress']) => {
		if (!workout || !user?.id) return;
		setBusy('save');
		try {
			const response = await fetchAPI(`/api/user-workouts?id=${workout.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clerkId: user.id, blocks, ...(progress ? { progress } : {}) }),
			});
			if (response.success) setWorkout(response.data);
			else Alert.alert('Could not update workout', response.error || 'Please try again.');
		} finally {
			setBusy(null);
		}
	};

	const removeBlock = (index: number) => {
		if (!workout) return;
		const mains = workout.blocks.filter(b => b.section === 'main').length;
		if (workout.blocks[index].section === 'main' && mains <= 1) {
			Alert.alert('Keep at least one exercise');
			return;
		}
		saveBlocks(workout.blocks.filter((_, i) => i !== index));
	};

	const openSwap = async (index: number) => {
		if (!workout) return;
		setSwapIndex(index);
		setAlternatives(null);
		const params = new URLSearchParams({
			slug: workout.blocks[index].slug,
			equipment: workout.inputs.equipment.join(','),
			exclude: workout.blocks.map(b => b.slug).join(','),
		});
		try {
			const response = await fetchAPI(`/api/exercise-library/alternatives?${params}`, {
				method: 'GET',
			});
			setAlternatives(response.success ? response.data : []);
		} catch {
			setAlternatives([]);
		}
	};

	const applySwap = (slug: string) => {
		if (!workout || swapIndex === null) return;
		const blocks = workout.blocks.map((b, i) => (i === swapIndex ? { ...b, slug } : b));
		setSwapIndex(null);
		saveBlocks(blocks);
	};

	const shuffle = async () => {
		if (!workout || !user?.id) return;
		setBusy('shuffle');
		try {
			const response = await fetchAPI('/api/workout-builder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					...workout.inputs,
					replaceWorkoutId: workout.id,
				}),
			});
			if (response.success) setWorkout(response.data);
			else Alert.alert('Could not shuffle', response.error || 'Please try again.');
		} finally {
			setBusy(null);
		}
	};

	const deleteWorkout = () => {
		if (!workout || !user?.id) return;
		Alert.alert('Delete workout?', 'Any calories already saved to activity stay logged.', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					await fetchAPI(`/api/user-workouts?id=${workout.id}&clerkId=${user.id}`, {
						method: 'DELETE',
					});
					router.back();
				},
			},
		]);
	};

	const style = workout ? STYLE_OPTIONS.find(s => s.key === workout.inputs.style) : null;
	const detailBlock = detailIndex !== null ? workout?.blocks[detailIndex] : null;
	const detail = detailBlock ? workout?.exercises[detailBlock.slug] : null;

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">Workout</Text>
					{workout ? (
						<TouchableOpacity onPress={deleteWorkout} hitSlop={10}>
							<Ionicons name="trash-outline" size={22} color="#574F47" />
						</TouchableOpacity>
					) : (
						<View style={{ width: 26 }} />
					)}
				</View>

				{!workout ? (
					<View className="flex-1 items-center justify-center">
						{loadError ? (
							<Text className="font-JakartaMedium text-[#574F47]">{loadError}</Text>
						) : (
							<ActivityIndicator color={ACCENT} />
						)}
					</View>
				) : (
					<>
						<NestableScrollContainer
							contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 }}
							showsVerticalScrollIndicator={false}
						>
							{/* Summary */}
							<Text className="font-JakartaExtraBold text-[24px] text-[#262135]">
								{workout.title}
							</Text>
							<View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
								<Pill icon="time-outline" label={`~${workout.est_minutes} min`} />
								<Pill icon="location-outline" label={workout.location_label} />
								{style && <Pill icon={style.icon} label={style.label} />}
							</View>
							{workout.inputs.equipment.length > 0 && (
								<Text className="text-xs font-JakartaMedium text-[#574F47] mt-3">
									{workout.inputs.equipment.map(e => EQUIPMENT_LABELS[e]).join(' · ')}
								</Text>
							)}

							{workout.status === 'completed' && (
								<View className="flex-row items-center rounded-2xl px-4 py-3 mt-4 bg-[#7DB88A1A]">
									<Ionicons name="checkmark-circle" size={20} color="#7DB88A" />
									<Text className="flex-1 ml-2 text-sm font-JakartaSemiBold text-[#262135]">
										Done · {workout.active_minutes} min · {workout.calories} kcal saved to activity
									</Text>
								</View>
							)}

							{SECTIONS.map(section => {
								const rows = workout.blocks
									.map((block, index) => ({ block, index }))
									.filter(({ block }) => block.section === section);
								if (rows.length === 0) return null;
								return (
									<View key={section}>
										<View className="flex-row items-baseline justify-between mt-7 mb-2 mx-1">
											<Text
												className="text-[11px] font-JakartaSemiBold text-[#574F47]"
												style={EYEBROW_STYLE}
											>
												{SECTION_LABELS[section]}
											</Text>
										</View>
										<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden">
											{reorderable ? (
												<NestableDraggableFlatList
													data={rows}
													keyExtractor={rowKey}
													onDragBegin={() =>
														Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
													}
													onDragEnd={({ data, from, to }) => {
														if (from !== to) reorderSection(section, data);
													}}
													activationDistance={8}
													renderItem={({ item, drag, isActive, getIndex }) => (
														<ScaleDecorator activeScale={1.03}>
															{renderRow(item, getIndex() ?? 0, rows.length, drag, isActive)}
														</ScaleDecorator>
													)}
												/>
											) : (
												rows.map((row, i) => (
													<View key={rowKey(row)}>{renderRow(row, i, rows.length)}</View>
												))
											)}
										</View>
									</View>
								);
							})}
						</NestableScrollContainer>

						{workout.status === 'in_progress' && (
							<View
								className="px-5 pt-3 border-t-[1px] border-[#F0EBE6]"
								style={{ paddingBottom: 16 + insets.bottom }}
							>
								<View className="flex-row items-center justify-center mb-3">
									<Ionicons name="time-outline" size={16} color="#574F47" />
									<Text className="ml-1.5 font-JakartaBold text-[15px] text-[#262135]">
										{formatClock(elapsedSeconds(workout.progress, now))}
									</Text>
									<Text className="ml-1.5 font-JakartaMedium text-[12px] text-[#574F47]">
										{workout.progress?.runningSince ? 'workout time' : 'paused'}
									</Text>
								</View>
								<View className="flex-row" style={{ columnGap: 12 }}>
									<TouchableOpacity
										onPress={() => router.push(`/training/${workout.id}/play?finish=1`)}
										disabled={busy !== null}
										className="flex-row items-center justify-center rounded-xl py-3.5 px-5"
										style={{ backgroundColor: '#E0858526' }}
										accessibilityLabel="Stop workout and review"
									>
										<Ionicons name="stop" size={16} color="#B54848" />
										<Text
											className="font-JakartaBold text-[15px] ml-1.5"
											style={{ color: '#B54848' }}
										>
											Stop workout
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => router.push(`/training/${workout.id}/play`)}
										disabled={busy !== null}
										className="flex-1 flex-row items-center justify-center rounded-xl py-3.5"
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
							</View>
						)}
						{workout.status === 'planned' && (
							<View
								className="flex-row px-5 pt-3"
								style={{ paddingBottom: 16 + insets.bottom, columnGap: 12 }}
							>
								<TouchableOpacity
									onPress={shuffle}
									disabled={busy !== null}
									className="flex-row items-center justify-center bg-[#F1F1F1] rounded-xl py-3.5 px-5"
								>
									{busy === 'shuffle' ? (
										<ActivityIndicator size="small" color={INK} />
									) : (
										<>
											<Ionicons name="shuffle" size={18} color={INK} />
											<Text className="text-[#262135] font-JakartaSemiBold ml-1.5">Shuffle</Text>
										</>
									)}
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => router.push(`/training/${workout.id}/play`)}
									disabled={busy !== null}
									className="flex-1 rounded-xl py-3.5"
									style={{ backgroundColor: '#262135' }}
								>
									<Text
										className="text-white text-center font-JakartaBold text-[15px]"
										style={BUTTON_TEXT_SHADOW}
									>
										Start workout
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</>
				)}
			</View>

			{/* Exercise detail */}
			<ReactNativeModal
				isVisible={!!detail}
				onBackdropPress={() => setDetailIndex(null)}
				onBackButtonPress={() => setDetailIndex(null)}
				className="m-0 justify-end"
			>
				{detail && detailBlock && (
					<View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
						<ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom }}>
							<View className="flex-row justify-between items-start mb-4">
								<Text className="flex-1 text-xl font-JakartaExtraBold text-[#262135] pr-3">
									{detail.name}
								</Text>
								<TouchableOpacity onPress={() => setDetailIndex(null)} hitSlop={10}>
									<Ionicons name="close" size={24} color="#334155" />
								</TouchableOpacity>
							</View>
							<ExerciseFrames images={detail.images} height={200} />
							<View className="flex-row items-center justify-between mt-4 mb-4">
								<Text className="text-xs font-JakartaMedium text-[#574F47] flex-1 pr-3">
									{formatPrescription(detailBlock)} ·{' '}
									{[...detail.primary_muscles, ...detail.secondary_muscles]
										.slice(0, 3)
										.map(capitalize)
										.join(', ')}
								</Text>
								<WatchDemoButton exerciseName={detail.name} />
							</View>
							<InstructionSteps steps={detail.instructions} />
						</ScrollView>
					</View>
				)}
			</ReactNativeModal>

			{/* Swap */}
			<ReactNativeModal
				isVisible={swapIndex !== null}
				onBackdropPress={() => setSwapIndex(null)}
				onBackButtonPress={() => setSwapIndex(null)}
				className="m-0 justify-end"
			>
				<View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: 24 + insets.bottom }}>
					<View className="flex-row justify-between items-center mb-1">
						<Text className="text-xl font-JakartaExtraBold text-[#262135]">Swap exercise</Text>
						<TouchableOpacity onPress={() => setSwapIndex(null)} hitSlop={10}>
							<Ionicons name="close" size={24} color="#334155" />
						</TouchableOpacity>
					</View>
					<Text className="text-xs font-JakartaMedium text-[#574F47] mb-4">
						Same muscles, using your equipment.
					</Text>
					{alternatives === null ? (
						<ActivityIndicator color={ACCENT} className="my-6" />
					) : alternatives.length === 0 ? (
						<Text className="text-sm font-JakartaMedium text-[#574F47] my-4">
							No alternatives for this one with your equipment.
						</Text>
					) : (
						<View style={{ rowGap: 8 }}>
							{alternatives.map(alt => (
								<TouchableOpacity
									key={alt.slug}
									onPress={() => applySwap(alt.slug)}
									activeOpacity={0.8}
									className="flex-row items-center rounded-2xl border-[1px] border-[#F0EBE6] p-2.5"
								>
									<ExerciseFrames images={alt.images} size={48} animate={false} />
									<View className="flex-1 ml-3">
										<Text className="text-sm font-JakartaSemiBold text-[#262135]">{alt.name}</Text>
										<Text className="text-xs font-JakartaMedium text-[#574F47] mt-0.5">
											{alt.primary_muscles.map(capitalize).join(', ')}
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={16} color="#857869" />
								</TouchableOpacity>
							))}
						</View>
					)}
				</View>
			</ReactNativeModal>
		</>
	);
};

const Pill = ({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) => (
	<View className="flex-row items-center bg-white rounded-full border-[1px] border-[#F0EBE6] px-3 py-1.5">
		<Ionicons name={icon} size={13} color="#574F47" />
		<Text className="text-xs font-JakartaSemiBold text-[#262135] ml-1">{label}</Text>
	</View>
);

export default TrainingPlan;
