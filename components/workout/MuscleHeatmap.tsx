import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	runOnJS,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import { getTodayDate } from '@/lib/dateUtils';
import { fetchAPI } from '@/lib/fetch';
import { shortDate } from '@/lib/progress';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';

import {
	BACK_SHAPES,
	BODY_VIEWBOX,
	FRONT_SHAPES,
	MIRROR_TRANSFORM,
	type BodyShape,
	type Muscle,
} from './bodyShapes';

// Activity tab: which muscles your training has worked this week / month / all time,
// on a body you can drag to turn around. Data: GET /api/muscle-heatmap (fortia-api
// src/lib/muscleHeatmap.ts) — sets per muscle from built workouts, logged exercises
// and activities.

type Range = 'week' | 'month' | 'all';
const RANGES: { key: Range; label: string }[] = [
	{ key: 'week', label: 'Week' },
	{ key: 'month', label: 'Month' },
	{ key: 'all', label: 'All time' },
];

interface MuscleStat {
	muscle: Muscle;
	sets: number;
	weeklySets: number;
	level: 0 | 1 | 2 | 3 | 4;
	lastTrained: string | null;
}

interface Heatmap {
	range: Range;
	scale: 'weekly' | 'relative';
	sessions: number;
	muscles: MuscleStat[];
}

// Untrained → most worked, warm brand-adjacent ramp
export const HEAT_COLORS = ['#E2D8CD', '#F3D9C6', '#E8B898', '#DB8E6A', '#C8613F'];
const SILHOUETTE = '#E9E1D8';
const NEUTRAL = '#F1EBE4';

export const MUSCLE_LABELS: Record<Muscle, string> = {
	chest: 'Chest',
	shoulders: 'Shoulders',
	traps: 'Traps',
	biceps: 'Biceps',
	triceps: 'Triceps',
	forearms: 'Forearms',
	abdominals: 'Abs',
	lats: 'Lats',
	'middle back': 'Upper back',
	'lower back': 'Lower back',
	glutes: 'Glutes',
	abductors: 'Outer hips',
	adductors: 'Inner thighs',
	quadriceps: 'Quads',
	hamstrings: 'Hamstrings',
	calves: 'Calves',
};

const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const BODY_WIDTH = 150;
const BODY_HEIGHT = 270;
const DRAG_DEG_PER_PX = 0.8;

const formatSets = (n: number) =>
	`${Number.isInteger(n) ? n : n.toFixed(1)} set${n === 1 ? '' : 's'}`;

const BodyFigure = ({
	shapes,
	levels,
	selected,
	onSelect,
}: {
	shapes: BodyShape[];
	levels: Partial<Record<Muscle, number>>;
	selected: Muscle | null;
	onSelect: (muscle: Muscle) => void;
}) => {
	const fillFor = (s: BodyShape) => (s.muscle ? HEAT_COLORS[levels[s.muscle] ?? 0] : NEUTRAL);
	const draw = (s: BodyShape, i: number, base: boolean) => {
		const isSelected = !base && s.muscle && s.muscle === selected;
		const props = {
			d: s.d,
			fill: base ? SILHOUETTE : fillFor(s),
			stroke: base ? SILHOUETTE : isSelected ? '#262135' : '#FFFFFF',
			strokeWidth: base ? 6 : isSelected ? 1.8 : 1.2,
			strokeLinejoin: 'round' as const,
			onPress: !base && s.muscle ? () => onSelect(s.muscle!) : undefined,
		};
		return (
			<G key={`${base ? 'b' : 'm'}${i}`}>
				<Path {...props} />
				{s.mirror && (
					<G transform={MIRROR_TRANSFORM}>
						<Path {...props} />
					</G>
				)}
			</G>
		);
	};
	return (
		<Svg width={BODY_WIDTH} height={BODY_HEIGHT} viewBox={BODY_VIEWBOX}>
			{/* Silhouette first (thick same-colour stroke merges the parts), muscles on top */}
			{shapes.map((s, i) => draw(s, i, true))}
			{/* Selected muscle drawn last so its outline isn't covered by neighbours */}
			{[...shapes]
				.map((s, i) => [s, i] as const)
				.sort(([a], [b]) => Number(a.muscle === selected) - Number(b.muscle === selected))
				.map(([s, i]) => draw(s, i, false))}
		</Svg>
	);
};

const MuscleHeatmap = () => {
	const { user } = useUser();
	const navigation = useNavigation();
	const [range, setRange] = useState<Range>('week');
	const [data, setData] = useState<Partial<Record<Range, Heatmap>>>({});
	const [selected, setSelected] = useState<Muscle | null>(null);
	const [side, setSide] = useState<'front' | 'back'>('front');
	const [showMissed, setShowMissed] = useState(false);

	const fetchData = useCallback(() => {
		if (!user?.id) return;
		fetchAPI(`/api/muscle-heatmap?clerkId=${user.id}&range=${range}&date=${getTodayDate()}`, {
			method: 'GET',
		})
			.then(res => {
				if (res.success) setData(prev => ({ ...prev, [range]: res.data }));
			})
			.catch(err => console.error('Load muscle heat map error:', err));
	}, [user?.id, range]);

	useRefetchOnFocus(fetchData, `${user?.id}|${range}`);

	// --- Rotation: drag sideways to turn the body; it settles on front or back ---------
	const angle = useSharedValue(0);
	const startAngle = useSharedValue(0);

	useAnimatedReaction(
		() => (Math.cos((angle.value * Math.PI) / 180) >= 0 ? 'front' : 'back'),
		(now, prev) => {
			if (now !== prev) runOnJS(setSide)(now);
		}
	);

	const pan = Gesture.Pan()
		.activeOffsetX([-8, 8])
		.failOffsetY([-12, 12])
		.onStart(() => {
			startAngle.value = angle.value;
		})
		.onUpdate(e => {
			angle.value = startAngle.value + e.translationX * DRAG_DEG_PER_PX;
		})
		.onEnd(e => {
			const projected = angle.value + e.velocityX * 0.12 * DRAG_DEG_PER_PX;
			angle.value = withSpring(Math.round(projected / 180) * 180, {
				damping: 18,
				stiffness: 120,
			});
		});

	// Front / Back switch: turn the body round to the chosen side
	const showSide = (target: 'front' | 'back') => {
		if (target === side) return;
		angle.value = withTiming(Math.round(angle.value / 180) * 180 + 180, { duration: 450 });
	};

	// Each face is shown only while it points at the viewer
	const faceStyle = (deg: number) => {
		'worklet';
		return {
			opacity: Math.cos((deg * Math.PI) / 180) >= 0 ? 1 : 0,
			transform: [{ perspective: 700 }, { rotateY: `${deg}deg` }],
		};
	};
	const frontStyle = useAnimatedStyle(() => faceStyle(angle.value));
	const backStyle = useAnimatedStyle(() => faceStyle(angle.value + 180));

	// Picking from a list turns the body to a side that shows that muscle
	const pickFromList = (muscle: Muscle) => {
		setSelected(muscle);
		const shapesFor = side === 'front' ? FRONT_SHAPES : BACK_SHAPES;
		if (!shapesFor.some(sh => sh.muscle === muscle)) showSide(side === 'front' ? 'back' : 'front');
	};

	// The tabs swipe horizontally too — pause that while a finger is on the body
	const setTabSwipe = (enabled: boolean) =>
		navigation.setOptions({ swipeEnabled: enabled } as object);

	const heatmap = data[range];
	const levels = Object.fromEntries(
		(heatmap?.muscles || []).map(m => [m.muscle, m.level])
	) as Partial<Record<Muscle, number>>;
	const worked = (heatmap?.muscles || []).filter(m => m.sets > 0).sort((a, b) => b.sets - a.sets);
	const maxSets = worked[0]?.sets || 1;
	const missed = (heatmap?.muscles || []).filter(m => m.sets === 0);
	const picked = heatmap?.muscles.find(m => m.muscle === selected);

	return (
		<View className="mt-3">
			<View className="flex-row items-center justify-between mb-3">
				<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
					Muscles worked
				</Text>
				<View className="flex-row bg-[#F1F1F1] rounded-full p-1">
					{RANGES.map(r => (
						<TouchableOpacity
							key={r.key}
							onPress={() => setRange(r.key)}
							className="px-2.5 py-1 rounded-full"
							style={{ backgroundColor: range === r.key ? '#E3BBA1' : 'transparent' }}
						>
							<Text
								className="text-[11px] font-JakartaSemiBold"
								style={{ color: range === r.key ? '#FFFFFF' : '#334155' }}
							>
								{r.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4">
				<View className="flex-row">
					{/* Body */}
					<View
						style={{ width: BODY_WIDTH }}
						onTouchStart={() => setTabSwipe(false)}
						onTouchEnd={() => setTabSwipe(true)}
						onTouchCancel={() => setTabSwipe(true)}
					>
						<GestureDetector gesture={pan}>
							<View style={{ width: BODY_WIDTH, height: BODY_HEIGHT + 14 }}>
								<Svg width={BODY_WIDTH} height={14} style={{ position: 'absolute', bottom: 0 }}>
									<Ellipse
										cx={BODY_WIDTH / 2}
										cy={7}
										rx={38}
										ry={5}
										fill="#262135"
										opacity={0.06}
									/>
								</Svg>
								<Animated.View
									pointerEvents={side === 'front' ? 'auto' : 'none'}
									style={[{ position: 'absolute', top: 0 }, frontStyle]}
								>
									<BodyFigure
										shapes={FRONT_SHAPES}
										levels={levels}
										selected={selected}
										onSelect={setSelected}
									/>
								</Animated.View>
								<Animated.View
									pointerEvents={side === 'back' ? 'auto' : 'none'}
									style={[{ position: 'absolute', top: 0 }, backStyle]}
								>
									<BodyFigure
										shapes={BACK_SHAPES}
										levels={levels}
										selected={selected}
										onSelect={setSelected}
									/>
								</Animated.View>
							</View>
						</GestureDetector>
						<View className="flex-row self-center mt-2 bg-[#F1F1F1] rounded-full p-1">
							{(['front', 'back'] as const).map(key => (
								<TouchableOpacity
									key={key}
									onPress={() => showSide(key)}
									className="px-3.5 py-1 rounded-full"
									style={{ backgroundColor: side === key ? '#E3BBA1' : 'transparent' }}
									accessibilityState={{ selected: side === key }}
								>
									<Text
										className="text-[11px] font-JakartaSemiBold"
										style={{ color: side === key ? '#FFFFFF' : '#334155' }}
									>
										{key === 'front' ? 'Front' : 'Back'}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Most worked */}
					<View className="flex-1 ml-4">
						<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
							Most worked
						</Text>
						{!heatmap ? null : worked.length === 0 ? (
							<Text className="text-[12px] font-JakartaMedium text-[#574F47] mt-2 leading-5">
								{range === 'week'
									? 'No strength work this week yet. Finish a workout to light it up.'
									: 'Finish a workout to see which muscles it works.'}
							</Text>
						) : (
							<View className="mt-2" style={{ rowGap: 10 }}>
								{worked.slice(0, 6).map(m => (
									<TouchableOpacity key={m.muscle} onPress={() => pickFromList(m.muscle)}>
										<View className="flex-row justify-between">
											<Text
												className="text-[12px] font-JakartaSemiBold"
												style={{ color: m.muscle === selected ? '#C8613F' : '#262135' }}
											>
												{MUSCLE_LABELS[m.muscle]}
											</Text>
											<Text className="text-[11px] font-JakartaMedium text-[#574F47]">
												{formatSets(m.sets)}
											</Text>
										</View>
										<View className="h-1.5 rounded-full bg-[#F0EBE6] mt-1 overflow-hidden">
											<View
												className="h-full rounded-full"
												style={{
													width: `${(m.sets / maxSets) * 100}%`,
													backgroundColor: HEAT_COLORS[Math.max(1, m.level)],
												}}
											/>
										</View>
									</TouchableOpacity>
								))}
							</View>
						)}
						{heatmap && worked.length > 0 && missed.length > 0 && (
							<View className="mt-3">
								<TouchableOpacity
									onPress={() => setShowMissed(v => !v)}
									className="flex-row items-center"
									hitSlop={6}
									accessibilityState={{ expanded: showMissed }}
								>
									<Text
										className="flex-1 text-[11px] font-JakartaMedium text-[#574F47] leading-4"
										numberOfLines={showMissed ? undefined : 2}
									>
										<Text className="font-JakartaSemiBold">Not trained · {missed.length}</Text>
										{showMissed ? '' : `  ${missed.map(m => MUSCLE_LABELS[m.muscle]).join(', ')}`}
									</Text>
									<Ionicons
										name={showMissed ? 'chevron-up' : 'chevron-down'}
										size={13}
										color="#857869"
									/>
								</TouchableOpacity>
								{showMissed && (
									<View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
										{missed.map(m => (
											<TouchableOpacity
												key={m.muscle}
												onPress={() => pickFromList(m.muscle)}
												className="rounded-full px-2.5 py-1 border-[1px]"
												style={{
													borderColor: m.muscle === selected ? '#262135' : '#F0EBE6',
													backgroundColor: '#F9F9F8',
												}}
											>
												<Text className="text-[11px] font-JakartaSemiBold text-[#262135]">
													{MUSCLE_LABELS[m.muscle]}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								)}
							</View>
						)}
					</View>
				</View>

				{picked && (
					<TouchableOpacity
						onPress={() => setSelected(null)}
						className="mt-3 rounded-2xl bg-[#F9F9F8] border-[1px] border-[#F0EBE6] px-4 py-3 flex-row items-center"
					>
						<View
							className="w-3 h-3 rounded-full mr-3"
							style={{ backgroundColor: HEAT_COLORS[picked.level] }}
						/>
						<View className="flex-1">
							<Text className="text-[13px] font-JakartaBold text-[#262135]">
								{MUSCLE_LABELS[picked.muscle]}
							</Text>
							<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-0.5">
								{picked.sets > 0
									? `${formatSets(picked.sets)}${
											heatmap?.scale === 'weekly' && range !== 'week'
												? ` · ${picked.weeklySets} a week`
												: ''
										} · last ${shortDate(picked.lastTrained!)}`
									: 'Not trained in this period'}
							</Text>
						</View>
						<Ionicons name="close" size={16} color="#857869" />
					</TouchableOpacity>
				)}

				{/* Legend */}
				<View className="flex-row items-center justify-between mt-4">
					<View className="flex-row items-center">
						<Text className="text-[10px] font-JakartaMedium text-[#574F47] mr-1.5">Less</Text>
						{HEAT_COLORS.map(c => (
							<View
								key={c}
								className="w-3.5 h-2 rounded-sm mr-0.5"
								style={{ backgroundColor: c }}
							/>
						))}
						<Text className="text-[10px] font-JakartaMedium text-[#574F47] ml-1">More</Text>
					</View>
					<Text className="text-[10px] font-JakartaMedium text-[#574F47]">
						{heatmap?.scale === 'relative' ? 'vs. your most trained' : '10+ sets a week = full'}
					</Text>
				</View>
			</View>
		</View>
	);
};

export default MuscleHeatmap;
