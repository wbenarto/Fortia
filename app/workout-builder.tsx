import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchAPI } from '@/lib/fetch';
import { SCREEN_BG } from '@/lib/theme';
import {
	DEFAULT_PREFS,
	DURATIONS,
	EQUIPMENT_LABELS,
	FOCUS_OPTIONS,
	GYM_EQUIPMENT,
	HOME_EQUIPMENT,
	LOCATION_OPTIONS,
	MAX_FOCUS,
	STYLE_OPTIONS,
	equipmentFor,
	loadBuilderPrefs,
	saveBuilderPrefs,
	type BuilderPrefs,
	type EquipmentKey,
	type FocusKey,
} from '@/lib/workoutBuilder';

const INK = '#262135';
const ACCENT = '#E3BBA1';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

const SectionLabel = ({ children, hint }: { children: string; hint?: string }) => (
	<View className="flex-row items-baseline justify-between mb-2 ml-1 mt-7">
		<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
			{children}
		</Text>
		{hint ? <Text className="text-[11px] font-JakartaMedium text-[#574F47]">{hint}</Text> : null}
	</View>
);

const Chip = ({
	label,
	selected,
	onPress,
}: {
	label: string;
	selected: boolean;
	onPress: () => void;
}) => (
	<TouchableOpacity
		onPress={onPress}
		activeOpacity={0.8}
		accessibilityState={{ selected }}
		className="px-4 py-2 rounded-full border-[1px]"
		style={{
			backgroundColor: selected ? ACCENT : '#FFFFFF',
			borderColor: selected ? ACCENT : '#F0EBE6',
		}}
	>
		<Text
			className="text-xs font-JakartaSemiBold"
			style={{ color: selected ? '#FFFFFF' : '#334155' }}
		>
			{label}
		</Text>
	</TouchableOpacity>
);

// Workout builder: one screen of choices → POST /api/workout-builder → plan screen.
const WorkoutBuilder = () => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const [prefs, setPrefs] = useState<BuilderPrefs>(DEFAULT_PREFS);
	const [isBuilding, setIsBuilding] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		loadBuilderPrefs().then(setPrefs);
	}, []);

	const update = (patch: Partial<BuilderPrefs>) => setPrefs(prev => ({ ...prev, ...patch }));

	const toggleFocus = (key: FocusKey) => {
		const { focus } = prefs;
		if (key === 'full_body') return update({ focus: ['full_body'] });
		const withoutFull = focus.filter(f => f !== 'full_body');
		if (withoutFull.includes(key)) {
			const next = withoutFull.filter(f => f !== key);
			update({ focus: next.length ? next : ['full_body'] });
		} else if (withoutFull.length < MAX_FOCUS) {
			update({ focus: [...withoutFull, key] });
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

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">Build a workout</Text>
					<View style={{ width: 26 }} />
				</View>

				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 }}
					showsVerticalScrollIndicator={false}
				>
					<SectionLabel>Duration</SectionLabel>
					<View className="flex-row bg-[#F1F1F1] rounded-full p-1">
						{DURATIONS.map(minutes => {
							const selected = prefs.duration === minutes;
							return (
								<TouchableOpacity
									key={minutes}
									onPress={() => update({ duration: minutes })}
									className="flex-1 py-2 rounded-full items-center"
									style={{ backgroundColor: selected ? ACCENT : 'transparent' }}
								>
									<Text
										className="text-xs font-JakartaSemiBold"
										style={{ color: selected ? '#FFFFFF' : '#334155' }}
									>
										{minutes} min
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>

					<SectionLabel hint={`Up to ${MAX_FOCUS}`}>Focus</SectionLabel>
					<View className="flex-row flex-wrap" style={{ gap: 8 }}>
						{FOCUS_OPTIONS.map(option => (
							<Chip
								key={option.key}
								label={option.label}
								selected={prefs.focus.includes(option.key)}
								onPress={() => toggleFocus(option.key)}
							/>
						))}
					</View>

					<SectionLabel>Where</SectionLabel>
					<View className="flex-row bg-[#F1F1F1] rounded-full p-1">
						{LOCATION_OPTIONS.map(option => {
							const selected = prefs.location === option.key;
							return (
								<TouchableOpacity
									key={option.key}
									onPress={() => update({ location: option.key })}
									className="flex-1 py-2 rounded-full items-center"
									style={{ backgroundColor: selected ? ACCENT : 'transparent' }}
								>
									<Text
										className="text-xs font-JakartaSemiBold"
										style={{ color: selected ? '#FFFFFF' : '#334155' }}
									>
										{option.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>

					{equipmentOptions.length > 0 && (
						<>
							<SectionLabel hint={prefs.location === 'home' ? 'Optional' : undefined}>
								{prefs.location === 'gym' ? 'Equipment available' : 'Anything at home?'}
							</SectionLabel>
							<View className="flex-row flex-wrap" style={{ gap: 8 }}>
								{equipmentOptions.map(key => (
									<Chip
										key={key}
										label={EQUIPMENT_LABELS[key]}
										selected={prefs[equipmentKey].includes(key)}
										onPress={() => toggleEquipment(key)}
									/>
								))}
							</View>
						</>
					)}
					{prefs.location === 'anywhere' && (
						<Text className="text-xs font-JakartaMedium text-[#574F47] mt-2 ml-1">
							Bodyweight only — no equipment needed.
						</Text>
					)}

					<SectionLabel>Style</SectionLabel>
					<View style={{ rowGap: 8 }}>
						{STYLE_OPTIONS.map(option => {
							const selected = prefs.style === option.key;
							return (
								<TouchableOpacity
									key={option.key}
									onPress={() => update({ style: option.key })}
									activeOpacity={0.8}
									accessibilityRole="radio"
									accessibilityState={{ selected }}
									className="flex-row items-center rounded-2xl px-4 py-3 border-[1px]"
									style={{
										borderColor: selected ? ACCENT : '#F0EBE6',
										backgroundColor: selected ? `${ACCENT}1F` : '#FFFFFF',
									}}
								>
									<View className="w-9 h-9 rounded-full items-center justify-center bg-[#F9F9F8] border-[1px] border-[#F0EBE6]">
										<Ionicons name={option.icon} size={17} color={INK} />
									</View>
									<View className="flex-1 ml-3">
										<Text className="text-sm font-JakartaBold text-[#262135]">{option.label}</Text>
										<Text className="text-xs font-JakartaMedium text-[#574F47] mt-0.5">
											{option.description}
										</Text>
									</View>
									<Ionicons
										name={selected ? 'checkmark-circle' : 'ellipse-outline'}
										size={20}
										color={selected ? ACCENT : '#857869'}
									/>
								</TouchableOpacity>
							);
						})}
					</View>

					{error ? <Text className="text-xs text-[#E08585] mt-4">{error}</Text> : null}
				</ScrollView>

				<View className="px-5 pt-3" style={{ paddingBottom: 16 + insets.bottom }}>
					<TouchableOpacity
						onPress={build}
						disabled={isBuilding}
						className={`rounded-xl py-3.5 ${isBuilding ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'}`}
					>
						{isBuilding ? (
							<View className="flex-row items-center justify-center">
								<ActivityIndicator size="small" color={ACCENT} />
								<Text className="text-[#574F47] font-JakartaSemiBold ml-2">
									Building your workout…
								</Text>
							</View>
						) : (
							<Text className="text-white text-center font-JakartaSemiBold">Build workout</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</>
	);
};

export default WorkoutBuilder;
