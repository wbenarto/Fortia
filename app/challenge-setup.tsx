import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
	DURATION_PRESETS,
	MAX_CHALLENGE_DAYS,
	endDateFor,
	type ChallengeDetail,
} from '@/lib/challenges';
import { getLocalDate, getTodayDate } from '@/lib/dateUtils';
import { DIET_INFO, DIET_TYPES, resolveDietType, type DietType } from '@/lib/diet';
import { fetchAPI } from '@/lib/fetch';
import { calculateMacros } from '@/lib/nutritionTargets';
import MacroBar from '@/components/MacroBar';
import { addDays, diffDays, shortDate } from '@/lib/progress';
import { MACRO_COLORS, SCREEN_BG } from '@/lib/theme';
import { triggerUserProfileRefresh, useUserProfile } from '@/lib/userUtils';

// Start a macro challenge: dates, diet (switches the user's real diet + targets) and
// a weekly workout goal. POST /api/challenges.

const INK = '#262135';
const BUTTON = '#D4A07E';
const EYEBROW = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const BUTTON_TEXT_SHADOW = {
	textShadowColor: 'rgba(110,60,30,0.35)',
	textShadowOffset: { width: 0, height: 1 },
	textShadowRadius: 2,
};

const toDate = (iso: string) => new Date(`${iso}T12:00:00`);

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
		className="px-3.5 py-2 rounded-full"
		style={{ backgroundColor: selected ? BUTTON : '#F1F1F1' }}
		accessibilityState={{ selected }}
	>
		<Text
			className={`text-[13px] ${selected ? 'font-JakartaBold text-white' : 'font-JakartaSemiBold text-[#334155]'}`}
			style={selected ? BUTTON_TEXT_SHADOW : undefined}
		>
			{label}
		</Text>
	</TouchableOpacity>
);

const Label = ({ children }: { children: string }) => (
	<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-2.5 mt-7" style={EYEBROW}>
		{children}
	</Text>
);

const ChallengeSetup = () => {
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const profile = useUserProfile();
	const today = getTodayDate();

	const [start, setStart] = useState(today);
	const [startPicker, setStartPicker] = useState(false);
	const [preset, setPreset] = useState<string | null>('30');
	const [customEnd, setCustomEnd] = useState<string | null>(null);
	const [endPicker, setEndPicker] = useState(false);
	const [diet, setDiet] = useState<DietType>(resolveDietType(profile.dietType));
	const [dietTouched, setDietTouched] = useState(false);
	const [eatenToday, setEatenToday] = useState({ protein: 0, carbs: 0, fats: 0 });

	// The profile loads after the screen opens: pre-select the user's current diet
	useEffect(() => {
		if (!dietTouched && profile.dietType) setDiet(resolveDietType(profile.dietType));
	}, [profile.dietType, dietTouched]);

	// Today's intake, so the macro preview shows real bars against the new targets
	useEffect(() => {
		if (!user?.id) return;
		fetchAPI(`/api/meals?clerkId=${user.id}&date=${today}&summary=true`, { method: 'GET' })
			.then(res => {
				if (!res.success || !res.data) return;
				setEatenToday({
					protein: Number(res.data.total_protein) || 0,
					carbs: Number(res.data.total_carbs) || 0,
					fats: Number(res.data.total_fats) || 0,
				});
			})
			.catch(() => {});
	}, [user?.id, today]);

	// Same macro split the server applies when the challenge starts (calories don't
	// change with diet type, only how they're split)
	const dailyCalories = Number(profile.dailyCalories) || 0;
	const preview = dailyCalories
		? calculateMacros(dailyCalories, diet, Number(profile.weight))
		: null;
	const currentDiet = resolveDietType(profile.dietType);
	const [workouts, setWorkouts] = useState(3);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const presetDays = DURATION_PRESETS.find(p => p.key === preset)?.days;
	const end = presetDays ? endDateFor(start, presetDays) : customEnd;
	const length = end ? diffDays(start, end) + 1 : 0;
	const lengthOk = length >= 7 && length <= MAX_CHALLENGE_DAYS;
	const startChoice = start === today ? 'today' : start === addDays(today, 1) ? 'tomorrow' : 'pick';

	const submit = async () => {
		if (!user?.id || !end || !lengthOk) return;
		setSaving(true);
		setError('');
		try {
			const response = await fetchAPI('/api/challenges', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					startDate: start,
					endDate: end,
					dietType: diet,
					workoutsPerWeek: workouts,
					today,
				}),
			});
			if (response.success) {
				triggerUserProfileRefresh(); // diet + macro targets changed
				const detail: ChallengeDetail = response.data;
				router.replace({ pathname: '/challenge', params: { id: String(detail.challenge.id) } });
			} else {
				setError(response.error || 'Could not start the challenge.');
			}
		} catch {
			setError('Could not start the challenge. Check your connection and try again.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">New challenge</Text>
					<View style={{ width: 26 }} />
				</View>

				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
					showsVerticalScrollIndicator={false}
				>
					{/* Rules */}
					<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mt-2">
						<Text className="font-JakartaExtraBold text-[18px] text-[#262135]">
							Macro challenge
						</Text>
						<View className="mt-3" style={{ rowGap: 10 }}>
							{[
								['checkmark-circle', 'Each day, stay at or under your calories, carbs and fat.'],
								['barbell', 'Reach your weekly workout goal.'],
							].map(([icon, text]) => (
								<View key={text} className="flex-row items-start">
									<Ionicons
										name={icon as keyof typeof Ionicons.glyphMap}
										size={17}
										color="#30A14E"
									/>
									<Text className="flex-1 ml-2 font-JakartaMedium text-[13px] leading-5 text-[#3D3630]">
										{text}
									</Text>
								</View>
							))}
						</View>
					</View>

					<Label>Start</Label>
					<View className="flex-row flex-wrap" style={{ columnGap: 10, rowGap: 10 }}>
						<Chip
							label="Today"
							selected={startChoice === 'today'}
							onPress={() => setStart(today)}
						/>
						<Chip
							label="Tomorrow"
							selected={startChoice === 'tomorrow'}
							onPress={() => setStart(addDays(today, 1))}
						/>
						<Chip
							label={startChoice === 'pick' ? shortDate(start) : 'Pick a date'}
							selected={startChoice === 'pick'}
							onPress={() => setStartPicker(v => !v)}
						/>
					</View>
					{startPicker && (
						<DateTimePicker
							value={toDate(start)}
							mode="date"
							display="inline"
							minimumDate={toDate(today)}
							accentColor={BUTTON}
							onChange={(_, date) => {
								if (date) setStart(getLocalDate(date));
								setStartPicker(false);
							}}
						/>
					)}

					<Label>Length</Label>
					<View className="flex-row flex-wrap" style={{ columnGap: 10, rowGap: 10 }}>
						{DURATION_PRESETS.map(p => (
							<Chip
								key={p.key}
								label={p.label}
								selected={preset === p.key}
								onPress={() => {
									setPreset(p.key);
									setEndPicker(false);
								}}
							/>
						))}
						<Chip
							label={!preset && customEnd ? `Until ${shortDate(customEnd)}` : 'Pick end date'}
							selected={!preset}
							onPress={() => {
								setPreset(null);
								if (!customEnd) setCustomEnd(endDateFor(start, 30));
								setEndPicker(v => !v);
							}}
						/>
					</View>
					{endPicker && !preset && (
						<DateTimePicker
							value={toDate(customEnd || endDateFor(start, 30))}
							mode="date"
							display="inline"
							minimumDate={toDate(addDays(start, 6))}
							maximumDate={toDate(addDays(start, MAX_CHALLENGE_DAYS - 1))}
							accentColor={BUTTON}
							onChange={(_, date) => {
								if (date) setCustomEnd(getLocalDate(date));
								setEndPicker(false);
							}}
						/>
					)}
					{end && (
						<Text className="font-JakartaMedium text-[13px] text-[#3D3630] mt-3">
							{shortDate(start)} – {shortDate(end)} · {length} days
							{!lengthOk ? `  (choose 7–${MAX_CHALLENGE_DAYS} days)` : ''}
						</Text>
					)}

					<Label>Diet</Label>
					<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden">
						{DIET_TYPES.map((key, i) => {
							const selected = diet === key;
							return (
								<TouchableOpacity
									key={key}
									onPress={() => {
										setDiet(key);
										setDietTouched(true);
									}}
									className={`flex-row items-center px-4 py-3.5 ${i < DIET_TYPES.length - 1 ? 'border-b-[1px] border-[#F0EBE6]' : ''}`}
									accessibilityState={{ selected }}
								>
									<View className="flex-1">
										<Text className="font-JakartaSemiBold text-[14px] text-[#262135]">
											{DIET_INFO[key].label}
											{key === currentDiet && profile.dietType ? (
												<Text className="font-JakartaBold text-[12px] text-[#30A14E]">
													{' '}
													· Current
												</Text>
											) : null}
										</Text>
										<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-0.5">
											{DIET_INFO[key].description}
										</Text>
									</View>
									<Ionicons
										name={selected ? 'radio-button-on' : 'radio-button-off'}
										size={22}
										color={selected ? BUTTON : '#A39689'}
									/>
								</TouchableOpacity>
							);
						})}
					</View>
					{preview && (
						<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mt-3">
							<View className="flex-row items-baseline justify-between">
								<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
									{DIET_INFO[diet].label} targets
								</Text>
								<Text className="font-JakartaBold text-[15px] text-[#262135]">
									{dailyCalories.toLocaleString()}
									<Text className="font-JakartaMedium text-[12px] text-[#574F47]"> cal a day</Text>
								</Text>
							</View>
							<View className="flex-row items-stretch mt-3" style={{ columnGap: 20 }}>
								<MacroBar
									label="Protein"
									color={MACRO_COLORS.protein}
									eaten={eatenToday.protein}
									goal={preview.dailyProtein}
								/>
								<MacroBar
									label="Carbs"
									color={MACRO_COLORS.carbs}
									eaten={eatenToday.carbs}
									goal={preview.dailyCarbs}
								/>
								<MacroBar
									label="Fat"
									color={MACRO_COLORS.fats}
									eaten={eatenToday.fats}
									goal={preview.dailyFats}
								/>
							</View>
							<Text className="font-JakartaMedium text-[11px] text-[#574F47] mt-3">
								Bars show what you've eaten today against these targets.
							</Text>
						</View>
					)}
					<Text className="font-JakartaMedium text-[12px] text-[#574F47] mt-2 leading-5">
						This becomes your diet program, so your macro targets update across the app.
					</Text>

					<Label>Workouts per week</Label>
					<View className="flex-row justify-between">
						{[1, 2, 3, 4, 5, 6, 7].map(n => (
							<TouchableOpacity
								key={n}
								onPress={() => setWorkouts(n)}
								className="w-10 h-10 rounded-full items-center justify-center"
								style={{ backgroundColor: workouts === n ? BUTTON : '#F1F1F1' }}
								accessibilityLabel={`${n} workouts per week`}
								accessibilityState={{ selected: workouts === n }}
							>
								<Text
									className={`text-[15px] ${workouts === n ? 'font-JakartaBold text-white' : 'font-JakartaSemiBold text-[#334155]'}`}
								>
									{n}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{!!error && (
						<Text className="font-JakartaMedium text-[13px] text-[#C24C4C] mt-5">{error}</Text>
					)}
				</ScrollView>

				<View
					className="px-5 pt-3 border-t-[1px] border-[#F0EBE6]"
					style={{ paddingBottom: 24 + insets.bottom }}
				>
					<TouchableOpacity
						onPress={submit}
						disabled={saving || !lengthOk}
						className="rounded-xl py-3 items-center"
						style={{ backgroundColor: saving || !lengthOk ? '#F1F1F1' : BUTTON }}
					>
						{saving ? (
							<ActivityIndicator color="#574F47" />
						) : (
							<Text
								className={`font-JakartaBold text-[17px] ${lengthOk ? 'text-white' : 'text-[#574F47]'}`}
								style={lengthOk ? BUTTON_TEXT_SHADOW : undefined}
							>
								Start challenge
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</>
	);
};

export default ChallengeSetup;
