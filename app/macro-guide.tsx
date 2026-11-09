import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
	Easing,
	FadeIn,
	FadeInDown,
	FadeOutDown,
	LinearTransition,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { diffDays } from '@/lib/progress';
import { MACRO_COLORS, SCREEN_BG } from '@/lib/theme';
import { resolveDietType } from '@/lib/diet';
import { defaultMealType } from '@/components/LogMealModal';
import {
	GUIDE_FOODS,
	GUIDE_MACROS,
	GUIDE_MACRO_LABELS,
	gapHint,
	rankFoods,
	type GuideFood,
	type GuideMacro,
	type GuideMacros,
	type RankedFood,
} from '@/lib/mealGuide';

const INK = '#262135';
const SOFT = '#574F47';
const OVER_TEXT = '#B54848';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const COLOR: Record<GuideMacro, string> = {
	protein: MACRO_COLORS.protein,
	carbs: MACRO_COLORS.carbs,
	fats: MACRO_COLORS.fats,
};
const EMPTY: GuideMacros = { calories: 0, protein: 0, carbs: 0, fats: 0 };
// Same fallback as the Home nutrition card when no goals are set
const DEFAULT_TARGETS: GuideMacros = { calories: 2000, protein: 125, carbs: 225, fats: 67 };

const isMacro = (value: unknown): value is GuideMacro =>
	typeof value === 'string' && (GUIDE_MACROS as string[]).includes(value);

const dayLabel = (iso: string) => {
	const ago = diffDays(iso, getTodayDate());
	if (ago === 0) return 'Today';
	if (ago === 1) return 'Yesterday';
	return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
};

interface OwnMeal {
	food_name: string;
	portion_size: string;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	ingredients: string[][] | null;
}

// The user's recent + favorite meals as guide foods, one per name + portion
const toOwnFoods = (meals: OwnMeal[]): GuideFood[] => {
	const seen = new Set<string>();
	const out: GuideFood[] = [];
	for (const m of meals) {
		const key = `${m.food_name.trim().toLowerCase()}|${(m.portion_size || '').trim().toLowerCase()}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const calories = Number(m.calories) || 0;
		if (calories <= 0) continue;
		out.push({
			id: `own-${key}`,
			name: m.food_name,
			portion: m.portion_size || '1 serving',
			kind: calories >= 350 ? 'meal' : 'snack',
			emoji: '🍽️',
			calories,
			protein: Number(m.protein) || 0,
			carbs: Number(m.carbs) || 0,
			fats: Number(m.fats) || 0,
			ingredients: m.ingredients,
			own: true,
		});
	}
	return out;
};

// ── Gap card ──────────────────────────────────────────────────────────────

const GapCard = ({
	macro,
	eaten,
	targets,
	day,
}: {
	macro: GuideMacro;
	eaten: GuideMacros;
	targets: GuideMacros;
	day: string;
}) => {
	const color = COLOR[macro];
	const target = targets[macro];
	const gap = Math.round(target - eaten[macro]);
	const caloriesLeft = Math.round(targets.calories - eaten.calories);
	const pct = target > 0 ? Math.min(1, eaten[macro] / target) : 0;

	const fill = useSharedValue(0);
	useEffect(() => {
		fill.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) });
	}, [pct]);
	const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

	return (
		<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-5">
			<View className="flex-row items-center">
				<View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
				<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
					{GUIDE_MACRO_LABELS[macro]} · {day}
				</Text>
			</View>

			<View className="flex-row items-baseline mt-2">
				{gap > 0 ? (
					<>
						<Text className="font-JakartaExtraBold text-[40px] text-[#262135]">{gap}g</Text>
						<Text className="font-JakartaSemiBold text-[15px] text-[#574F47] ml-2">to go</Text>
					</>
				) : (
					<View className="flex-row items-center">
						<Ionicons name="checkmark-circle" size={30} color="#7DB88A" />
						<Text className="font-JakartaExtraBold text-[26px] text-[#262135] ml-2">
							Target hit
						</Text>
					</View>
				)}
			</View>

			<View
				className="h-[10px] rounded-full overflow-hidden mt-3"
				style={{ backgroundColor: `${color}2E` }}
			>
				<Animated.View
					style={[{ height: '100%', borderRadius: 999, backgroundColor: color }, fillStyle]}
				/>
			</View>

			<View className="flex-row justify-between mt-2">
				<Text className="text-[12px] font-JakartaMedium text-[#574F47]">
					<Text className="font-JakartaBold text-[#262135]">{Math.round(eaten[macro])}</Text> /{' '}
					{target}g eaten
				</Text>
				<Text
					className="text-[12px] font-JakartaMedium"
					style={{ color: caloriesLeft < 0 ? OVER_TEXT : SOFT }}
				>
					<Text className="font-JakartaBold" style={{ color: caloriesLeft < 0 ? OVER_TEXT : INK }}>
						{Math.abs(caloriesLeft).toLocaleString()}
					</Text>{' '}
					cal {caloriesLeft < 0 ? 'over' : 'left'}
				</Text>
			</View>

			<Text className="text-[13px] font-JakartaMedium text-[#574F47] mt-3 leading-[19px]">
				{gapHint(macro, gap, caloriesLeft)}
			</Text>
		</View>
	);
};

// ── Food row ──────────────────────────────────────────────────────────────

const FoodRow = ({
	ranked,
	macro,
	logged,
	busy,
	onAdd,
}: {
	ranked: RankedFood;
	macro: GuideMacro;
	logged: boolean;
	busy: boolean;
	onAdd: () => void;
}) => {
	const { food, caloriesOver, pushesOver } = ranked;
	const color = COLOR[macro];
	const warning =
		caloriesOver > 0
			? `${Math.round(caloriesOver)} cal over`
			: pushesOver.length
				? `Over on ${pushesOver.map(m => GUIDE_MACRO_LABELS[m].toLowerCase()).join(' & ')}`
				: null;

	return (
		<Animated.View
			layout={LinearTransition.duration(250)}
			className="flex-row items-center px-4 py-3.5"
		>
			<View className="w-11 h-11 rounded-full bg-[#F9F9F8] border-[1px] border-[#F0EBE6] items-center justify-center">
				<Text style={{ fontSize: 20 }}>{food.emoji}</Text>
			</View>

			<View className="flex-1 ml-3 mr-2">
				<Text className="font-JakartaSemiBold text-[14px] text-[#262135]" numberOfLines={1}>
					{food.name}
				</Text>
				<Text className="font-JakartaMedium text-[12px] text-[#574F47]" numberOfLines={1}>
					{food.portion} · {Math.round(food.calories)} cal
				</Text>
				<View
					className="flex-row items-center flex-wrap mt-1.5"
					style={{ columnGap: 6, rowGap: 4 }}
				>
					<View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}26` }}>
						<Text className="text-[11px] font-JakartaBold text-[#262135]">
							+{Math.round(food[macro])}g {GUIDE_MACRO_LABELS[macro].toLowerCase()}
						</Text>
					</View>
					<Text className="text-[11px] font-JakartaMedium text-[#574F47]">
						{GUIDE_MACROS.filter(m => m !== macro)
							.map(m => `${GUIDE_MACRO_LABELS[m][0]} ${Math.round(food[m])}g`)
							.join(' · ')}
					</Text>
					{warning && (
						<Text className="text-[11px] font-JakartaSemiBold" style={{ color: OVER_TEXT }}>
							{warning}
						</Text>
					)}
				</View>
			</View>

			<TouchableOpacity
				onPress={onAdd}
				disabled={logged || busy}
				className="w-9 h-9 rounded-full items-center justify-center"
				style={{ backgroundColor: logged ? '#7DB88A' : INK }}
				accessibilityRole="button"
				accessibilityLabel={logged ? `${food.name} logged` : `Log ${food.name}`}
			>
				{busy ? (
					<ActivityIndicator size="small" color="#FFFFFF" />
				) : (
					<Ionicons name={logged ? 'checkmark' : 'add'} size={20} color="#FFFFFF" />
				)}
			</TouchableOpacity>
		</Animated.View>
	);
};

const Section = ({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}) => (
	<View className="mt-7">
		<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] ml-1" style={EYEBROW_STYLE}>
			{title}
		</Text>
		{subtitle ? (
			<Text className="text-[12px] font-JakartaMedium text-[#574F47] ml-1 mt-0.5">{subtitle}</Text>
		) : null}
		<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden mt-2">
			{children}
		</View>
	</View>
);

const Hairline = () => <View className="h-[1px] bg-[#F0EBE6] mx-4" />;

// ── Screen ────────────────────────────────────────────────────────────────

interface LoggedEntry {
	mealId: string;
	food: GuideFood;
	mealType: string;
}

const MacroGuide = () => {
	const params = useLocalSearchParams<{ macro?: string; date?: string }>();
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const date = typeof params.date === 'string' && params.date ? params.date : getTodayDate();

	const [macro, setMacro] = useState<GuideMacro>(isMacro(params.macro) ? params.macro : 'protein');
	const [eaten, setEaten] = useState<GuideMacros>(EMPTY);
	const [targets, setTargets] = useState<GuideMacros>(DEFAULT_TARGETS);
	const [keto, setKeto] = useState(false);
	const [ownFoods, setOwnFoods] = useState<GuideFood[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	// Foods logged from this screen (food id → entry), for the check marks and Undo
	const [logged, setLogged] = useState<Record<string, LoggedEntry>>({});
	const [busyId, setBusyId] = useState<string | null>(null);
	const [toast, setToast] = useState<LoggedEntry | null>(null);
	const [error, setError] = useState('');
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const load = useCallback(async () => {
		if (!user?.id) return;
		setIsLoading(true);
		try {
			const [summary, profile, recents, favorites] = await Promise.all([
				fetchAPI(`/api/meals?clerkId=${user.id}&date=${date}&summary=true`, { method: 'GET' }),
				fetchAPI(`/api/user?clerkId=${user.id}`, { method: 'GET' }),
				fetchAPI(`/api/meals?clerkId=${user.id}&recent=true`, { method: 'GET' }).catch(() => null),
				fetchAPI(`/api/favorite-meals?clerkId=${user.id}`, { method: 'GET' }).catch(() => null),
			]);
			const day = summary?.success ? summary.data : null;
			setEaten({
				calories: Number(day?.total_calories) || 0,
				protein: Number(day?.total_protein) || 0,
				carbs: Number(day?.total_carbs) || 0,
				fats: Number(day?.total_fats) || 0,
			});
			const g = profile?.success ? profile.data : null;
			setTargets({
				calories: Math.round(Number(g?.daily_calories) || DEFAULT_TARGETS.calories),
				protein: Math.round(Number(g?.daily_protein) || DEFAULT_TARGETS.protein),
				carbs: Math.round(Number(g?.daily_carbs) || DEFAULT_TARGETS.carbs),
				fats: Math.round(Number(g?.daily_fats) || DEFAULT_TARGETS.fats),
			});
			setKeto(resolveDietType(g?.diet_type) === 'keto');
			setOwnFoods(
				toOwnFoods([
					...(favorites?.success ? favorites.data || [] : []),
					...(recents?.success ? recents.data || [] : []),
				])
			);
		} catch (err) {
			console.error('Load meal guide error:', err);
			setError("Couldn't load today's totals. Go back and try again.");
		} finally {
			setIsLoading(false);
		}
	}, [user?.id, date]);

	useEffect(() => {
		load();
		return () => {
			if (toastTimer.current) clearTimeout(toastTimer.current);
		};
	}, [load]);

	const left: GuideMacros = {
		calories: targets.calories - eaten.calories,
		protein: targets.protein - eaten.protein,
		carbs: targets.carbs - eaten.carbs,
		fats: targets.fats - eaten.fats,
	};
	const gap = Math.round(left[macro]);

	const lists = useMemo(() => {
		const opts = { keto };
		const curated = rankFoods(GUIDE_FOODS, macro, left, targets, opts);
		return {
			own: rankFoods(ownFoods, macro, left, targets, opts).slice(0, 4),
			snacks: curated.filter(r => r.food.kind === 'snack').slice(0, 6),
			meals: curated.filter(r => r.food.kind === 'meal').slice(0, 5),
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [macro, eaten, targets, keto, ownFoods]);

	// The other macro furthest from its target, offered once this one is done
	const nextMacro = GUIDE_MACROS.filter(m => m !== macro)
		.map(m => ({ m, share: targets[m] > 0 ? left[m] / targets[m] : 0 }))
		.sort((a, b) => b.share - a.share)[0];

	const showToast = (entry: LoggedEntry | null) => {
		if (toastTimer.current) clearTimeout(toastTimer.current);
		setToast(entry);
		if (entry) toastTimer.current = setTimeout(() => setToast(null), 4500);
	};

	const addMacros = (food: GuideFood, sign: 1 | -1) =>
		setEaten(prev => ({
			calories: prev.calories + sign * food.calories,
			protein: prev.protein + sign * food.protein,
			carbs: prev.carbs + sign * food.carbs,
			fats: prev.fats + sign * food.fats,
		}));

	const logFood = async (food: GuideFood) => {
		if (!user?.id || busyId) return;
		setBusyId(food.id);
		setError('');
		const mealType = food.kind === 'snack' && !food.own ? 'snack' : defaultMealType();
		try {
			const response = await fetchAPI('/api/meals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					foodName: food.name,
					portionSize: food.portion,
					calories: food.calories,
					protein: food.protein,
					carbs: food.carbs,
					fats: food.fats,
					fiber: 0,
					sugar: 0,
					sodium: 0,
					confidenceScore: food.own ? 0.8 : 0.7,
					mealType,
					date,
					ingredients: food.ingredients ?? [[food.name, food.portion]],
				}),
			});
			if (!response.success) {
				setError(response.error || 'Failed to log food');
				return;
			}
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
			const entry = { mealId: String(response.data?.id), food, mealType };
			setLogged(prev => ({ ...prev, [food.id]: entry }));
			addMacros(food, 1);
			showToast(entry);
		} catch (err) {
			console.error('Meal guide log error:', err);
			setError('Failed to log food. Please try again.');
		} finally {
			setBusyId(null);
		}
	};

	const undo = async (entry: LoggedEntry) => {
		showToast(null);
		try {
			const response = await fetchAPI(`/api/meals?id=${entry.mealId}`, { method: 'DELETE' });
			if (!response.success) throw new Error(response.error);
			setLogged(prev => {
				const next = { ...prev };
				delete next[entry.food.id];
				return next;
			});
			addMacros(entry.food, -1);
		} catch (err) {
			console.error('Meal guide undo error:', err);
			setError("Couldn't undo. Remove it from the Food log instead.");
		}
	};

	const renderList = (items: RankedFood[]) =>
		items.map((r, i) => (
			<View key={r.food.id}>
				{i > 0 && <Hairline />}
				<FoodRow
					ranked={r}
					macro={macro}
					logged={!!logged[r.food.id]}
					busy={busyId === r.food.id}
					onAdd={() => logFood(r.food)}
				/>
			</View>
		));

	return (
		<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
			<Stack.Screen options={{ headerShown: false }} />

			{/* Header */}
			<View className="flex-row items-center justify-between px-5 py-3">
				<TouchableOpacity onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
					<Ionicons name="chevron-back" size={26} color={INK} />
				</TouchableOpacity>
				<Text className="font-JakartaSemiBold text-[#262135] text-base">Meal guide</Text>
				<View style={{ width: 26 }} />
			</View>

			{/* Macro switch */}
			<View className="px-5">
				<View className="flex-row bg-[#F1F1F1] rounded-full p-1">
					{GUIDE_MACROS.map(m => {
						const active = m === macro;
						return (
							<TouchableOpacity
								key={m}
								onPress={() => {
									Haptics.selectionAsync().catch(() => {});
									setMacro(m);
								}}
								className="flex-1 flex-row items-center justify-center rounded-full py-2"
								style={{ backgroundColor: active ? '#E3BBA1' : 'transparent' }}
								accessibilityRole="button"
								accessibilityState={{ selected: active }}
							>
								<View
									className="w-1.5 h-1.5 rounded-full mr-1.5"
									style={{ backgroundColor: active ? '#FFFFFF' : COLOR[m] }}
								/>
								<Text
									className="font-JakartaSemiBold text-[13px]"
									style={{ color: active ? '#FFFFFF' : '#475569' }}
								>
									{GUIDE_MACRO_LABELS[m]}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#E3BBA1" />
				</View>
			) : (
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
					showsVerticalScrollIndicator={false}
				>
					<Animated.View key={macro} entering={FadeIn.duration(250)}>
						<GapCard macro={macro} eaten={eaten} targets={targets} day={dayLabel(date)} />

						{error ? (
							<Text
								className="text-[12px] font-JakartaSemiBold mt-3 ml-1"
								style={{ color: OVER_TEXT }}
							>
								{error}
							</Text>
						) : null}

						{gap <= 0 ? (
							nextMacro && nextMacro.share > 0.05 ? (
								<TouchableOpacity
									onPress={() => setMacro(nextMacro.m)}
									className="flex-row items-center bg-white rounded-3xl border-[1px] border-[#F0EBE6] px-4 py-3.5 mt-4"
								>
									<View
										className="w-9 h-9 rounded-full items-center justify-center"
										style={{ backgroundColor: `${COLOR[nextMacro.m]}26` }}
									>
										<View
											className="w-2.5 h-2.5 rounded-full"
											style={{ backgroundColor: COLOR[nextMacro.m] }}
										/>
									</View>
									<View className="flex-1 ml-3">
										<Text className="font-JakartaSemiBold text-[14px] text-[#262135]">
											{GUIDE_MACRO_LABELS[nextMacro.m]} is next
										</Text>
										<Text className="font-JakartaMedium text-[12px] text-[#574F47]">
											{Math.round(left[nextMacro.m])}g to go · see what fits
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={18} color="#857869" />
								</TouchableOpacity>
							) : null
						) : (
							<>
								{lists.own.length > 0 && (
									<Section title="From your meals" subtitle="Things you've logged before">
										{renderList(lists.own)}
									</Section>
								)}
								{lists.snacks.length > 0 && (
									<Section title="Snacks">{renderList(lists.snacks)}</Section>
								)}
								{lists.meals.length > 0 && (
									<Section title="Meals">{renderList(lists.meals)}</Section>
								)}
								<Text className="text-[11px] font-JakartaMedium text-[#857869] text-center mt-5 px-6">
									Tap + to log it as{' '}
									{dayLabel(date) === 'Today' ? "today's" : `${dayLabel(date)}'s`} snack or meal.
									Values are typical portions, so adjust in the Food log if yours differ.
								</Text>
							</>
						)}
					</Animated.View>
				</ScrollView>
			)}

			{/* Logged toast with Undo */}
			{toast && (
				<Animated.View
					entering={FadeInDown.duration(220)}
					exiting={FadeOutDown.duration(180)}
					className="absolute left-5 right-5 flex-row items-center rounded-2xl px-4 py-3"
					style={{ bottom: insets.bottom + 16, backgroundColor: INK }}
				>
					<Ionicons name="checkmark-circle" size={20} color="#7DB88A" />
					<Text
						className="flex-1 ml-2 text-white font-JakartaSemiBold text-[13px]"
						numberOfLines={1}
					>
						Added {toast.food.name} · {toast.mealType[0].toUpperCase() + toast.mealType.slice(1)}
					</Text>
					<TouchableOpacity onPress={() => undo(toast)} hitSlop={10}>
						<Text className="font-JakartaBold text-[13px]" style={{ color: '#E3BBA1' }}>
							Undo
						</Text>
					</TouchableOpacity>
				</Animated.View>
			)}
		</View>
	);
};

export default MacroGuide;
