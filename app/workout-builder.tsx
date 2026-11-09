import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
	Easing,
	FadeIn,
	FadeInDown,
	FadeOut,
	SlideInLeft,
	SlideInRight,
	ZoomIn,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import { fetchAPI } from '@/lib/fetch';
import { SCREEN_BG } from '@/lib/theme';
import {
	DEFAULT_PREFS,
	DURATIONS,
	EQUIPMENT_LABELS,
	FOCUS_GROUPS,
	FOCUS_OPTIONS,
	GYM_EQUIPMENT,
	HOME_EQUIPMENT,
	LOCATION_OPTIONS,
	MAX_FOCUS,
	NEEDS_EQUIPMENT_FOCUS,
	STYLE_OPTIONS,
	equipmentFor,
	loadBuilderPrefs,
	saveBuilderPrefs,
	type BuilderPrefs,
	type EquipmentKey,
	type FocusKey,
	type LocationKey,
} from '@/lib/workoutBuilder';

const INK = '#262135';
const ACCENT = '#E3BBA1';
const ACCENT_DARK = '#B07F62';
const BUTTON = '#D4A07E';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const BUTTON_TEXT_SHADOW = {
	textShadowColor: 'rgba(110,60,30,0.35)',
	textShadowOffset: { width: 0, height: 1 },
	textShadowRadius: 2,
};

type StepKey = 'style' | 'focus' | 'where' | 'time' | 'review';
const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
	{ key: 'style', title: 'What kind of workout?', subtitle: 'Pick the feel of today’s session.' },
	{
		key: 'focus',
		title: 'What do you want to train?',
		subtitle: `Pick up to ${MAX_FOCUS} areas or specific muscles.`,
	},
	{ key: 'where', title: 'Where are you training?', subtitle: 'We’ll only use what you have.' },
	{ key: 'time', title: 'How long do you have?', subtitle: 'Warm-up and cool-down included.' },
	{ key: 'review', title: 'Ready to build', subtitle: 'Tap any row to change it.' },
];

const LOCATION_ICON: Record<LocationKey, keyof typeof Ionicons.glyphMap> = {
	gym: 'barbell-outline',
	home: 'home-outline',
	anywhere: 'walk-outline',
};
const LOCATION_HINT: Record<LocationKey, string> = {
	gym: 'Full equipment',
	home: 'Whatever you have',
	anywhere: 'Bodyweight only',
};
const DURATION_HINT: Record<number, string> = {
	15: 'Quick',
	30: 'Short',
	45: 'Standard',
	60: 'Full',
	90: 'Long',
};

const BUILD_MESSAGES = [
	'Picking exercises for you…',
	'Balancing sets and rest…',
	'Adding a warm-up…',
	'Almost ready…',
];

const tap = () => Haptics.selectionAsync().catch(() => {});

// Pressable that springs down slightly while pressed
const PressScale = ({
	onPress,
	children,
	style,
	className,
	disabled,
	accessibilityLabel,
	accessibilityState,
}: {
	onPress: () => void;
	children: React.ReactNode;
	style?: object;
	className?: string;
	disabled?: boolean;
	accessibilityLabel?: string;
	accessibilityState?: { selected?: boolean; disabled?: boolean };
}) => {
	const scale = useSharedValue(1);
	const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
	return (
		<Animated.View style={animated}>
			<Pressable
				onPress={onPress}
				onPressIn={() => (scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
				onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 250 }))}
				disabled={disabled}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={accessibilityState}
				className={className}
				style={style}
			>
				{children}
			</Pressable>
		</Animated.View>
	);
};

const selectedStyle = (selected: boolean) => ({
	borderWidth: 1.5,
	borderColor: selected ? ACCENT : '#F0EBE6',
	backgroundColor: selected ? `${ACCENT}26` : '#FFFFFF',
});

const Check = ({ selected }: { selected: boolean }) =>
	selected ? (
		<Animated.View entering={ZoomIn.springify().damping(12)}>
			<Ionicons name="checkmark-circle" size={22} color={ACCENT_DARK} />
		</Animated.View>
	) : (
		<Ionicons name="ellipse-outline" size={22} color="#C9BFB5" />
	);

// Fades each option in a beat after the previous one
const Stagger = ({ index, children }: { index: number; children: React.ReactNode }) => (
	<Animated.View entering={FadeInDown.duration(320).delay(60 + index * 45)}>
		{children}
	</Animated.View>
);

// Workout builder: a few short steps → POST /api/workout-builder → plan screen.
const WorkoutBuilder = () => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [prefs, setPrefs] = useState<BuilderPrefs>(DEFAULT_PREFS);
	const [step, setStep] = useState(0);
	const [direction, setDirection] = useState<1 | -1>(1);
	const [isBuilding, setIsBuilding] = useState(false);
	const [error, setError] = useState('');

	const progress = useSharedValue(1 / STEPS.length);

	useEffect(() => {
		loadBuilderPrefs().then(setPrefs);
	}, []);

	useEffect(() => {
		progress.value = withTiming((step + 1) / STEPS.length, {
			duration: 350,
			easing: Easing.out(Easing.cubic),
		});
	}, [step]);

	const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

	const update = (patch: Partial<BuilderPrefs>) => {
		tap();
		setPrefs(prev => ({ ...prev, ...patch }));
	};

	const goTo = (next: number) => {
		setDirection(next > step ? 1 : -1);
		setError('');
		setStep(next);
	};

	const back = () => (step === 0 ? router.back() : goTo(step - 1));

	const toggleFocus = (key: FocusKey) => {
		const { focus } = prefs;
		if (key === 'full_body') return update({ focus: ['full_body'] });
		const withoutFull = focus.filter(f => f !== 'full_body');
		if (withoutFull.includes(key)) {
			const next = withoutFull.filter(f => f !== key);
			update({ focus: next.length ? next : ['full_body'] });
		} else if (withoutFull.length < MAX_FOCUS) {
			update({ focus: [...withoutFull, key] });
		} else {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
		}
	};

	const equipmentKey = prefs.location === 'gym' ? 'gymEquipment' : 'homeEquipment';
	const toggleEquipment = (key: EquipmentKey) => {
		const list = prefs[equipmentKey];
		update({
			[equipmentKey]: list.includes(key) ? list.filter(e => e !== key) : [...list, key],
		});
	};

	const build = async () => {
		if (!user?.id) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
		setIsBuilding(true);
		setError('');
		saveBuilderPrefs(prefs);
		try {
			const response = await fetchAPI('/api/workout-builder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					duration: prefs.duration,
					focus: prefs.focus,
					location: prefs.location,
					equipment: equipmentFor(prefs),
					style: prefs.style,
				}),
			});
			if (!response.success) {
				setError(response.error || 'Could not build a workout. Please try again.');
				return;
			}
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
			router.replace(`/training/${response.data.id}`);
		} catch (err) {
			console.error('Build workout error:', err);
			setError('Could not build a workout. Please try again.');
		} finally {
			setIsBuilding(false);
		}
	};

	const equipmentOptions =
		prefs.location === 'gym' ? GYM_EQUIPMENT : prefs.location === 'home' ? HOME_EQUIPMENT : [];

	const styleOption = STYLE_OPTIONS.find(o => o.key === prefs.style);
	const focusLabel = prefs.focus
		.map(f => FOCUS_OPTIONS.find(o => o.key === f)?.label ?? f)
		.join(', ');
	const equipment = equipmentFor(prefs);
	const whereLabel = LOCATION_OPTIONS.find(o => o.key === prefs.location)?.label ?? prefs.location;
	const whereDetail =
		prefs.location === 'anywhere'
			? 'Bodyweight only'
			: equipment.length
				? equipment.map(e => EQUIPMENT_LABELS[e]).join(', ')
				: 'No equipment';

	// Some muscles have no bodyweight moves in the library — say so before building
	const equipmentWarning =
		equipment.length === 0 && prefs.focus.some(f => NEEDS_EQUIPMENT_FOCUS.includes(f))
			? `${prefs.focus
					.filter(f => NEEDS_EQUIPMENT_FOCUS.includes(f))
					.map(f => FOCUS_OPTIONS.find(o => o.key === f)?.label ?? f)
					.join(
						', '
					)} need${prefs.focus.filter(f => NEEDS_EQUIPMENT_FOCUS.includes(f)).length === 1 ? 's' : ''} equipment — without it we’ll pick the closest moves.`
			: '';

	const renderWarning = () =>
		equipmentWarning ? (
			<Animated.View
				entering={FadeInDown.duration(250)}
				className="flex-row items-start rounded-2xl p-3.5 mt-4"
				style={{ backgroundColor: '#F2D58E40' }}
			>
				<Ionicons name="information-circle-outline" size={18} color="#8A6D1F" />
				<Text className="flex-1 ml-2 text-[12px] font-JakartaMedium text-[#5C4A16]">
					{equipmentWarning}
				</Text>
			</Animated.View>
		) : null;

	const renderStyle = () => (
		<View style={{ rowGap: 10 }}>
			{STYLE_OPTIONS.map((option, i) => {
				const selected = prefs.style === option.key;
				return (
					<Stagger key={option.key} index={i}>
						<PressScale
							onPress={() => update({ style: option.key })}
							accessibilityState={{ selected }}
							className="flex-row items-center rounded-3xl px-4 py-4"
							style={selectedStyle(selected)}
						>
							<View
								className="w-12 h-12 rounded-2xl items-center justify-center"
								style={{ backgroundColor: selected ? '#FFFFFF' : '#F9F6F2' }}
							>
								<Ionicons name={option.icon} size={22} color={selected ? ACCENT_DARK : INK} />
							</View>
							<View className="flex-1 ml-3.5">
								<Text className="text-[16px] font-JakartaBold text-[#262135]">{option.label}</Text>
								<Text className="text-[13px] font-JakartaMedium text-[#574F47] mt-0.5">
									{option.description}
								</Text>
							</View>
							<Check selected={selected} />
						</PressScale>
					</Stagger>
				);
			})}
		</View>
	);

	const renderFocus = () => {
		const count = prefs.focus.includes('full_body') ? 0 : prefs.focus.length;
		let order = 0; // running index so the stagger flows across groups
		return (
			<>
				{FOCUS_GROUPS.map(group => (
					<View key={group.title} className="mb-4">
						<Stagger index={order++}>
							<Text
								className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-1 ml-1"
								style={EYEBROW_STYLE}
							>
								{group.title}
							</Text>
						</Stagger>
						<View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
							{group.keys.map(key => {
								const option = FOCUS_OPTIONS.find(o => o.key === key);
								if (!option) return null;
								const selected = prefs.focus.includes(key);
								return (
									<View key={key} style={{ width: '33.333%', padding: 4 }}>
										<Stagger index={order++}>
											<PressScale
												onPress={() => toggleFocus(key)}
												accessibilityState={{ selected }}
												className="rounded-2xl items-center justify-center py-3.5"
												style={selectedStyle(selected)}
											>
												<Text
													className="text-[14px] font-JakartaBold"
													style={{ color: selected ? ACCENT_DARK : INK }}
													numberOfLines={1}
												>
													{option.label}
												</Text>
											</PressScale>
										</Stagger>
									</View>
								);
							})}
						</View>
					</View>
				))}
				<Animated.Text
					key={count}
					entering={FadeIn.duration(200)}
					className="text-[12px] font-JakartaMedium text-[#574F47] text-center"
				>
					{count === 0 ? 'Full body selected' : `${count} of ${MAX_FOCUS} selected`}
				</Animated.Text>
			</>
		);
	};

	const renderWhere = () => (
		<>
			<View className="flex-row" style={{ columnGap: 10 }}>
				{LOCATION_OPTIONS.map((option, i) => {
					const selected = prefs.location === option.key;
					return (
						<View key={option.key} className="flex-1">
							<Stagger index={i}>
								<PressScale
									onPress={() => update({ location: option.key })}
									accessibilityState={{ selected }}
									className="rounded-3xl items-center py-5 px-2"
									style={selectedStyle(selected)}
								>
									<View
										className="w-12 h-12 rounded-full items-center justify-center mb-2"
										style={{ backgroundColor: selected ? '#FFFFFF' : '#F9F6F2' }}
									>
										<Ionicons
											name={LOCATION_ICON[option.key]}
											size={22}
											color={selected ? ACCENT_DARK : INK}
										/>
									</View>
									<Text className="text-[15px] font-JakartaBold text-[#262135]">
										{option.label}
									</Text>
									<Text
										className="text-[11px] font-JakartaMedium text-[#574F47] mt-0.5 text-center"
										numberOfLines={1}
									>
										{LOCATION_HINT[option.key]}
									</Text>
								</PressScale>
							</Stagger>
						</View>
					);
				})}
			</View>

			{/* Equipment list swaps in when the place changes */}
			<Animated.View key={prefs.location} entering={FadeInDown.duration(300)} className="mt-7">
				{equipmentOptions.length > 0 ? (
					<>
						<View className="flex-row items-baseline justify-between mb-2.5 ml-1">
							<Text
								className="text-[11px] font-JakartaSemiBold text-[#574F47]"
								style={EYEBROW_STYLE}
							>
								{prefs.location === 'gym' ? 'Equipment available' : 'Anything at home?'}
							</Text>
							{prefs.location === 'home' && (
								<Text className="text-[11px] font-JakartaMedium text-[#574F47]">Optional</Text>
							)}
						</View>
						<View className="flex-row flex-wrap" style={{ gap: 8 }}>
							{equipmentOptions.map(key => {
								const selected = prefs[equipmentKey].includes(key);
								return (
									<PressScale
										key={key}
										onPress={() => toggleEquipment(key)}
										accessibilityState={{ selected }}
										className="flex-row items-center px-3.5 py-2 rounded-full"
										style={{
											borderWidth: 1,
											borderColor: selected ? ACCENT : '#F0EBE6',
											backgroundColor: selected ? ACCENT : '#FFFFFF',
										}}
									>
										{selected && (
											<Animated.View entering={ZoomIn.duration(180)} className="mr-1">
												<Ionicons name="checkmark" size={13} color="#FFFFFF" />
											</Animated.View>
										)}
										<Text
											className="text-[13px] font-JakartaSemiBold"
											style={{ color: selected ? '#FFFFFF' : '#334155' }}
										>
											{EQUIPMENT_LABELS[key]}
										</Text>
									</PressScale>
								);
							})}
						</View>
					</>
				) : (
					<View className="flex-row items-center bg-white rounded-2xl border-[1px] border-[#F0EBE6] p-4">
						<Ionicons name="body-outline" size={20} color={ACCENT_DARK} />
						<Text className="flex-1 ml-3 text-[13px] font-JakartaMedium text-[#3D3630]">
							Bodyweight only — no equipment needed. Great for travel or a park.
						</Text>
					</View>
				)}
			</Animated.View>
		</>
	);

	const renderTime = () => (
		<View className="flex-row flex-wrap" style={{ marginHorizontal: -5 }}>
			{DURATIONS.map((minutes, i) => {
				const selected = prefs.duration === minutes;
				return (
					<View key={minutes} style={{ width: i < 3 ? '33.333%' : '50%', padding: 5 }}>
						<Stagger index={i}>
							<PressScale
								onPress={() => update({ duration: minutes })}
								accessibilityState={{ selected }}
								accessibilityLabel={`${minutes} minutes`}
								className="rounded-3xl items-center py-5"
								style={selectedStyle(selected)}
							>
								<Text
									className="font-JakartaExtraBold text-[30px]"
									style={{ color: selected ? ACCENT_DARK : INK }}
								>
									{minutes}
								</Text>
								<Text
									className="text-[11px] font-JakartaSemiBold text-[#574F47]"
									style={EYEBROW_STYLE}
								>
									min · {DURATION_HINT[minutes] ?? ''}
								</Text>
							</PressScale>
						</Stagger>
					</View>
				);
			})}
		</View>
	);

	const reviewRows: {
		icon: keyof typeof Ionicons.glyphMap;
		label: string;
		value: string;
		step: number;
	}[] = [
		{
			icon: styleOption?.icon ?? 'barbell-outline',
			label: 'Type',
			value: styleOption?.label ?? '',
			step: 0,
		},
		{ icon: 'body-outline', label: 'Focus', value: focusLabel, step: 1 },
		{ icon: LOCATION_ICON[prefs.location], label: whereLabel, value: whereDetail, step: 2 },
		{ icon: 'time-outline', label: 'Time', value: `${prefs.duration} min`, step: 3 },
	];

	const renderReview = () => (
		<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden">
			{reviewRows.map((row, i) => (
				<Stagger key={row.label + i} index={i}>
					<TouchableOpacity
						activeOpacity={0.7}
						onPress={() => goTo(row.step)}
						className={`flex-row items-center px-4 py-3.5 ${i < reviewRows.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''}`}
						accessibilityLabel={`Change ${row.label}`}
					>
						<View className="w-9 h-9 rounded-full items-center justify-center bg-[#F9F9F8] border-[1px] border-[#F0EBE6]">
							<Ionicons name={row.icon} size={17} color={INK} />
						</View>
						<View className="flex-1 ml-3 mr-2">
							<Text className="text-[12px] font-JakartaMedium text-[#574F47]">{row.label}</Text>
							<Text className="text-[14px] font-JakartaSemiBold text-[#262135]" numberOfLines={2}>
								{row.value}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#857869" />
					</TouchableOpacity>
				</Stagger>
			))}
		</View>
	);

	const current = STEPS[step];
	const isLast = step === STEPS.length - 1;
	const entering = (direction === 1 ? SlideInRight : SlideInLeft)
		.duration(320)
		.easing(Easing.out(Easing.cubic));

	return (
		<>
			<Stack.Screen options={{ headerShown: false, gestureEnabled: step === 0 }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={back} hitSlop={10} accessibilityLabel="Back">
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">
						Build a custom workout
					</Text>
					<TouchableOpacity onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close">
						<Ionicons name="close" size={24} color="#857869" />
					</TouchableOpacity>
				</View>

				{/* Progress */}
				<View className="px-5">
					<View className="h-1.5 rounded-full bg-[#E9DFD3] overflow-hidden">
						<Animated.View
							style={[
								{ height: '100%', borderRadius: 999, backgroundColor: BUTTON },
								progressStyle,
							]}
						/>
					</View>
					<Text
						className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-2"
						style={EYEBROW_STYLE}
					>
						Step {step + 1} of {STEPS.length}
					</Text>
				</View>

				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
					showsVerticalScrollIndicator={false}
				>
					<Animated.View key={current.key} entering={entering}>
						<Text className="font-JakartaExtraBold text-[26px] text-[#262135]">
							{current.title}
						</Text>
						<Text className="font-JakartaMedium text-[14px] text-[#574F47] mt-1 mb-6">
							{current.subtitle}
						</Text>

						{current.key === 'style' && renderStyle()}
						{current.key === 'focus' && renderFocus()}
						{current.key === 'where' && (
							<>
								{renderWhere()}
								{renderWarning()}
							</>
						)}
						{current.key === 'time' && renderTime()}
						{current.key === 'review' && (
							<>
								{renderReview()}
								{renderWarning()}
							</>
						)}
					</Animated.View>

					{error ? <Text className="text-xs text-[#E08585] mt-4">{error}</Text> : null}
				</ScrollView>

				<View
					className="flex-row px-5 pt-3 border-t-[1px] border-[#F0EBE6]"
					style={{ paddingBottom: 16 + insets.bottom, columnGap: 10 }}
				>
					{step > 0 && (
						<Animated.View entering={FadeIn.duration(200)}>
							<TouchableOpacity
								onPress={back}
								className="bg-[#F1F1F1] rounded-xl py-3 px-5 items-center justify-center"
							>
								<Text className="font-JakartaSemiBold text-[15px] text-[#262135]">Back</Text>
							</TouchableOpacity>
						</Animated.View>
					)}
					<TouchableOpacity
						onPress={isLast ? build : () => goTo(step + 1)}
						disabled={isBuilding}
						className="flex-1 rounded-xl py-3 flex-row items-center justify-center"
						style={{ backgroundColor: '#262135' }}
					>
						<Text className="text-white font-JakartaBold text-[17px]" style={BUTTON_TEXT_SHADOW}>
							{isLast ? 'Build workout' : 'Continue'}
						</Text>
						<Ionicons
							name={isLast ? 'sparkles' : 'arrow-forward'}
							size={18}
							color="#FFFFFF"
							style={{ marginLeft: 6 }}
						/>
					</TouchableOpacity>
				</View>

				{isBuilding && <BuildingOverlay />}
			</View>
		</>
	);
};

// Full-screen "building" state: pulsing rings and rotating status lines
const BuildingOverlay = () => {
	const pulse = useSharedValue(0);
	const [messageIndex, setMessageIndex] = useState(0);

	useEffect(() => {
		pulse.value = withRepeat(
			withSequence(
				withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
				withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) })
			),
			-1
		);
		const timer = setInterval(
			() => setMessageIndex(i => Math.min(i + 1, BUILD_MESSAGES.length - 1)),
			1600
		);
		return () => clearInterval(timer);
	}, []);

	const ringStyle = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + pulse.value * 0.35 }],
		opacity: 0.45 - pulse.value * 0.35,
	}));
	const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.06 }] }));

	return (
		<Animated.View
			entering={FadeIn.duration(250)}
			exiting={FadeOut.duration(200)}
			style={[
				StyleSheet.absoluteFillObject,
				{
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: SCREEN_BG,
					zIndex: 10,
				},
			]}
		>
			<View className="items-center justify-center" style={{ width: 160, height: 160 }}>
				<Animated.View
					style={[
						{
							position: 'absolute',
							width: 120,
							height: 120,
							borderRadius: 60,
							backgroundColor: ACCENT,
						},
						ringStyle,
					]}
				/>
				<Animated.View
					style={[
						{
							width: 88,
							height: 88,
							borderRadius: 44,
							alignItems: 'center',
							justifyContent: 'center',
							backgroundColor: BUTTON,
						},
						coreStyle,
					]}
				>
					<Ionicons name="barbell" size={36} color="#FFFFFF" />
				</Animated.View>
			</View>
			<Text className="font-JakartaExtraBold text-[22px] text-[#262135] mt-6">
				Building your workout
			</Text>
			<Animated.Text
				key={messageIndex}
				entering={FadeInDown.duration(300)}
				className="font-JakartaMedium text-[14px] text-[#574F47] mt-2"
			>
				{BUILD_MESSAGES[messageIndex]}
			</Animated.Text>
		</Animated.View>
	);
};

export default WorkoutBuilder;
