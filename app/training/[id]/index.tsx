import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeModal from 'react-native-modal';
import { fetchAPI } from '@/lib/fetch';
import { SCREEN_BG } from '@/lib/theme';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import {
	EQUIPMENT_LABELS,
	SECTION_LABELS,
	STYLE_OPTIONS,
	capitalize,
	formatPrescription,
	type LibraryExercise,
	type Section,
	type UserWorkout,
	type WorkoutBlock,
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

	const editable = workout?.status === 'planned';

	const saveBlocks = async (blocks: WorkoutBlock[]) => {
		if (!workout || !user?.id) return;
		setBusy('save');
		try {
			const response = await fetchAPI(`/api/user-workouts?id=${workout.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clerkId: user.id, blocks }),
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
						<ScrollView
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
										<Text
											className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-7 mb-2 ml-1"
											style={EYEBROW_STYLE}
										>
											{SECTION_LABELS[section]}
										</Text>
										<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden">
											{rows.map(({ block, index }, i) => {
												const exercise = workout.exercises[block.slug];
												return (
													<TouchableOpacity
														key={`${block.slug}-${index}`}
														activeOpacity={0.7}
														onPress={() => setDetailIndex(index)}
														className={`flex-row items-center px-3 py-3 ${
															i < rows.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''
														}`}
													>
														<ExerciseFrames
															images={exercise?.images || []}
															size={52}
															animate={false}
														/>
														<View className="flex-1 mx-3">
															<Text
																className="font-JakartaSemiBold text-sm text-[#262135]"
																numberOfLines={2}
															>
																{exercise?.name || block.slug}
															</Text>
															<Text className="font-JakartaMedium text-xs text-[#574F47] mt-0.5">
																{formatPrescription(block)}
																{block.section === 'main' && block.rest
																	? ` · rest ${block.rest}s`
																	: ''}
																{exercise?.primary_muscles[0]
																	? ` · ${capitalize(exercise.primary_muscles[0])}`
																	: ''}
															</Text>
														</View>
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
											})}
										</View>
									</View>
								);
							})}
						</ScrollView>

						{workout.status !== 'completed' && (
							<View
								className="flex-row px-5 pt-3"
								style={{ paddingBottom: 16 + insets.bottom, columnGap: 12 }}
							>
								{editable && (
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
								)}
								<TouchableOpacity
									onPress={() => router.push(`/training/${workout.id}/play`)}
									disabled={busy !== null}
									className="flex-1 bg-[#E3BBA1] rounded-xl py-3.5"
								>
									<Text className="text-white text-center font-JakartaSemiBold">
										{workout.status === 'in_progress' ? 'Resume workout' : 'Start workout'}
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
