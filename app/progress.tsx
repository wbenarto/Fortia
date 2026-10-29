import { useCallback, useRef, useState, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { fetchAPI } from '@/lib/fetch';
import { MACRO_COLORS, SCREEN_BG } from '@/lib/theme';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import { formatWeight, toDisplayWeight, useUnitSystem, weightUnit } from '@/lib/units';
import {
	CALORIE_STATUS_COLOR,
	DOT_COLORS,
	RANGE_OPTIONS,
	addDays,
	dayLetter,
	progressUrl,
	rangeFor,
	shortDate,
	type ProgressData,
	type ProgressDay,
	type RangeKey,
} from '@/lib/progress';
import { Bars, ProgressBar, TrendLine, type BarPoint } from '@/components/progress/Charts';
import { ConsistencyCalendar, InsightList } from '@/components/progress/ConsistencyCalendar';

const INK = '#262135';
const ACCENT = '#E3BBA1';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const CARD = 'bg-white rounded-3xl border-[1px] border-[#F0EBE6] p-4 mb-4';

type TabKey = 'overview' | 'nutrition' | 'weight' | 'activity';
const TABS: { key: TabKey; label: string }[] = [
	{ key: 'overview', label: 'Overview' },
	{ key: 'nutrition', label: 'Nutrition' },
	{ key: 'weight', label: 'Weight' },
	{ key: 'activity', label: 'Activity' },
];

const SectionLabel = ({ children, right }: { children: string; right?: ReactNode }) => (
	<View className="flex-row items-center justify-between mb-2 ml-1">
		<Text className="text-[11px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
			{children}
		</Text>
		{right}
	</View>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
	<View style={{ flex: 1 }}>
		<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
			{label}
		</Text>
		<Text className="font-JakartaExtraBold text-[20px] text-[#262135] mt-0.5" numberOfLines={1}>
			{value}
		</Text>
		{sub ? (
			<Text className="font-JakartaMedium text-[11px] text-[#574F47]" numberOfLines={1}>
				{sub}
			</Text>
		) : null}
	</View>
);

// Sparse x-axis labels so bars stay readable at any range
const barLabel = (day: ProgressDay, index: number, total: number) => {
	if (total <= 7) return dayLetter(day.date);
	const every = total <= 31 ? 7 : 21;
	return (total - 1 - index) % every === 0 ? shortDate(day.date) : undefined;
};

const Progress = () => {
	const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const unitSystem = useUnitSystem();
	const [range, setRange] = useState<RangeKey>('week');
	const [tab, setTab] = useState<TabKey>(
		TABS.some(t => t.key === tabParam) ? (tabParam as TabKey) : 'overview'
	);
	const [data, setData] = useState<ProgressData | null>(null);
	const [error, setError] = useState('');
	const pagerRef = useRef<PagerView>(null);
	const tabIndex = TABS.findIndex(t => t.key === tab);

	// Tap a tab → slide the pager; swipe the pager → select the tab
	const selectTab = (key: TabKey) => {
		setTab(key);
		pagerRef.current?.setPage(TABS.findIndex(t => t.key === key));
	};

	const fetchProgress = useCallback(() => {
		if (!user?.id) return;
		const { from, to } = rangeFor(range);
		setError('');
		fetchAPI(progressUrl(user.id, from, to), { method: 'GET' })
			.then(response => {
				if (response.success) setData(response.data);
				else setError(response.error || 'Could not load your progress');
			})
			.catch(() => setError('Could not load your progress'));
	}, [user?.id, range]);

	useRefetchOnFocus(fetchProgress, `${user?.id}|${range}`);

	const expected = rangeFor(range);
	const loading = !data || data.from !== expected.from || data.to !== expected.to;

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<View className="flex-row items-center justify-between px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color={INK} />
					</TouchableOpacity>
					<Text className="font-JakartaSemiBold text-[#262135] text-base">Progress</Text>
					<View style={{ width: 26 }} />
				</View>

				{/* Tabs — a plain row (all four fit); a horizontal ScrollView here could be
				    squeezed to zero height by the content below, which then covered the tabs */}
				<View className="flex-row px-5" style={{ columnGap: 6, flexShrink: 0 }}>
					{TABS.map(option => {
						const selected = tab === option.key;
						return (
							<TouchableOpacity
								key={option.key}
								onPress={() => selectTab(option.key)}
								className="flex-1 items-center py-2 rounded-full border-[1px]"
								style={{
									backgroundColor: selected ? INK : '#FFFFFF',
									borderColor: selected ? INK : '#F0EBE6',
								}}
							>
								<Text
									className="text-xs font-JakartaSemiBold"
									style={{ color: selected ? '#FFFFFF' : '#334155' }}
									numberOfLines={1}
									adjustsFontSizeToFit
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{/* Range */}
				<View
					className="flex-row bg-[#F1F1F1] rounded-full p-1 mx-5 mt-3"
					style={{ flexShrink: 0 }}
				>
					{RANGE_OPTIONS.map(option => {
						const selected = range === option.key;
						return (
							<TouchableOpacity
								key={option.key}
								onPress={() => setRange(option.key)}
								className="flex-1 py-2 rounded-full items-center"
								style={{ backgroundColor: selected ? ACCENT : 'transparent' }}
							>
								<Text
									className="text-xs font-JakartaSemiBold"
									style={{ color: selected ? '#FFFFFF' : '#334155' }}
									numberOfLines={1}
									adjustsFontSizeToFit
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				<PagerView
					ref={pagerRef}
					style={{ flex: 1 }}
					initialPage={tabIndex}
					onPageSelected={e => setTab(TABS[e.nativeEvent.position].key)}
				>
					{TABS.map(page => (
						<View key={page.key} style={{ flex: 1 }}>
							{loading ? (
								<View className="flex-1 items-center justify-center">
									{error ? (
										<Text className="font-JakartaMedium text-[#574F47]">{error}</Text>
									) : (
										<ActivityIndicator color={ACCENT} />
									)}
								</View>
							) : (
								<ScrollView
									style={{ flex: 1 }}
									contentContainerStyle={{
										paddingHorizontal: 20,
										paddingTop: 16,
										paddingBottom: 40 + insets.bottom,
									}}
									showsVerticalScrollIndicator={false}
								>
									{page.key === 'overview' && <Overview data={data} range={range} />}
									{page.key === 'nutrition' && <Nutrition data={data} />}
									{page.key === 'weight' && <Weight data={data} unitSystem={unitSystem} />}
									{page.key === 'activity' && <Activity data={data} />}
								</ScrollView>
							)}
						</View>
					))}
				</PagerView>
			</View>
		</>
	);
};

// --- Overview ------------------------------------------------------------------------

const COUNT_PERIOD: Record<RangeKey, string> = {
	week: 'This week',
	month: 'Last 30 days',
	quarter: 'Last 3 months',
};

const Overview = ({ data, range }: { data: ProgressData; range: RangeKey }) => {
	const c = data.summary.consistency;
	const isWeek = range === 'week';
	const weekEnd = addDays(data.from, 6); // Saturday of the current week
	// How many times each thing was logged in the range
	const mealCount = data.days.reduce((sum, d) => sum + d.mealCount, 0);
	const mealDays = data.days.filter(d => d.logged.meal).length;
	const weighIns = data.days.filter(d => d.logged.weight).length;
	const workoutDays = data.days.filter(d => d.logged.exercise).length;
	return (
		<>
			<View className={CARD}>
				<View className="flex-row items-center">
					<View
						className="w-12 h-12 rounded-full items-center justify-center"
						style={{ backgroundColor: c.currentStreak ? '#E08585' + '1F' : '#F1F1F1' }}
					>
						<Ionicons name="flame" size={24} color={c.currentStreak ? '#E08585' : '#857869'} />
					</View>
					<View className="flex-1 ml-3">
						<Text className="font-JakartaExtraBold text-[22px] text-[#262135]">
							{c.currentStreak}-day streak
						</Text>
						<Text className="font-JakartaMedium text-xs text-[#574F47]">
							Best {c.bestStreak} days · any log counts
						</Text>
					</View>
				</View>
				<View className="flex-row mt-4">
					<Stat label="Days logged" value={`${c.daysWithAnyLog}/${c.daysInRange}`} />
					<Stat label="Meals logged" value={`${c.loggingRate ?? 0}%`} sub="of days" />
					<Stat label="Perfect days" value={`${c.perfectDays}`} sub="all 3 logged" />
				</View>
			</View>

			<SectionLabel>Insights</SectionLabel>
			<View className="mb-4">
				<InsightList insights={data.insights} />
			</View>

			{/* The count tiles double as the dot legend */}
			<SectionLabel>
				{isWeek ? `This week · ${shortDate(data.from)} – ${shortDate(weekEnd)}` : 'Consistency'}
			</SectionLabel>
			<View className={CARD}>
				<View className="flex-row mb-4" style={{ columnGap: 8 }}>
					<CountTile
						color={DOT_COLORS.meal}
						label="Meals"
						value={mealCount}
						sub={`on ${mealDays} day${mealDays === 1 ? '' : 's'}`}
					/>
					<CountTile
						color={DOT_COLORS.weight}
						label="Weigh-ins"
						value={weighIns}
						sub={weighIns === 1 ? 'day' : 'days'}
					/>
					<CountTile
						color={DOT_COLORS.exercise}
						label="Workouts"
						value={workoutDays}
						sub={workoutDays === 1 ? 'day' : 'days'}
					/>
				</View>
				<ConsistencyCalendar days={data.days} through={isWeek ? weekEnd : undefined} />
				<Text className="text-[10px] font-JakartaMedium text-[#574F47] mt-3 text-center">
					{COUNT_PERIOD[range]} · tap a day for details
				</Text>
			</View>
		</>
	);
};

const CountTile = ({
	color,
	label,
	value,
	sub,
}: {
	color: string;
	label: string;
	value: number;
	sub: string;
}) => (
	<View className="flex-1 rounded-2xl bg-[#F9F9F8] border-[1px] border-[#F0EBE6] px-3 py-2.5">
		<View className="flex-row items-center">
			<View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />
			<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
				{label}
			</Text>
		</View>
		<Text className="font-JakartaExtraBold text-[22px] text-[#262135] mt-1">{value}</Text>
		<Text className="font-JakartaMedium text-[11px] text-[#574F47]">{sub}</Text>
	</View>
);

// --- Nutrition -----------------------------------------------------------------------

const Nutrition = ({ data }: { data: ProgressData }) => {
	const n = data.summary.nutrition;
	const t = data.targets;
	const bars: BarPoint[] = data.days.map((day, i) => ({
		value: day.logged.meal ? day.calories : 0,
		color: day.calorieStatus ? CALORIE_STATUS_COLOR[day.calorieStatus] : '#857869',
		label: barLabel(day, i, data.days.length),
	}));
	const macros = [
		{ label: 'Protein', value: n.avgProtein, target: t.protein, color: MACRO_COLORS.protein },
		{ label: 'Carbs', value: n.avgCarbs, target: t.carbs, color: MACRO_COLORS.carbs },
		{ label: 'Fat', value: n.avgFats, target: t.fats, color: MACRO_COLORS.fats },
	];

	return (
		<>
			<View className={CARD}>
				<View className="flex-row">
					<Stat label="On target" value={`${n.onTargetDays}/${n.daysLogged}`} sub="logged days" />
					<Stat
						label="Avg eaten"
						value={n.avgCalories != null ? `${n.avgCalories.toLocaleString()}` : '—'}
						sub={t.calories ? `of ${t.calories.toLocaleString()} cal` : 'cal'}
					/>
					<Stat
						label="Protein"
						value={n.avgProteinPct != null ? `${n.avgProteinPct}%` : '—'}
						sub={`hit ${n.proteinHitDays} days`}
					/>
				</View>
			</View>

			<SectionLabel>Daily calories</SectionLabel>
			<View className={CARD}>
				<Bars data={bars} target={t.calories || null} />
				<View className="flex-row flex-wrap mt-3" style={{ columnGap: 12, rowGap: 4 }}>
					{(
						[
							['on', `On target · ${n.onTargetDays}`],
							['under', `Under · ${n.underDays}`],
							['over', `Over · ${n.overDays}`],
						] as const
					).map(([key, label]) => (
						<View key={key} className="flex-row items-center">
							<View
								className="w-2 h-2 rounded-full mr-1"
								style={{ backgroundColor: CALORIE_STATUS_COLOR[key] }}
							/>
							<Text className="text-[11px] font-JakartaMedium text-[#574F47]">{label}</Text>
						</View>
					))}
				</View>
				{n.weekendDelta != null && Math.abs(n.weekendDelta) >= 100 && (
					<Text className="text-xs font-JakartaMedium text-[#574F47] mt-2">
						Weekends average {Math.abs(Math.round(n.weekendDelta)).toLocaleString()} cal{' '}
						{n.weekendDelta > 0 ? 'more' : 'less'} than weekdays.
					</Text>
				)}
			</View>

			<SectionLabel>Average macros</SectionLabel>
			<View className={CARD}>
				{macros.map((macro, i) => (
					<View key={macro.label} className={i < macros.length - 1 ? 'mb-3.5' : ''}>
						<View className="flex-row justify-between mb-1.5">
							<Text className="text-[13px] font-JakartaSemiBold text-[#262135]">{macro.label}</Text>
							<Text className="text-xs font-JakartaMedium text-[#574F47]">
								{macro.value != null ? Math.round(macro.value) : '—'} / {Math.round(macro.target)} g
							</Text>
						</View>
						<ProgressBar value={macro.value || 0} target={macro.target} color={macro.color} />
					</View>
				))}
			</View>
			<Text className="text-[11px] font-JakartaMedium text-[#574F47] ml-1">
				Days are compared with your current targets. Today counts once it's on target.
			</Text>
		</>
	);
};

// --- Weight --------------------------------------------------------------------------

const Weight = ({
	data,
	unitSystem,
}: {
	data: ProgressData;
	unitSystem: ReturnType<typeof useUnitSystem>;
}) => {
	const w = data.summary.weight;
	const total = Math.max(1, data.days.length - 1);
	const weighIns = data.days
		.map((d, i) => ({ i, date: d.date, w: d.weight }))
		.filter((p): p is { i: number; date: string; w: number } => p.w != null);
	const display = (lb: number) => toDisplayWeight(lb, unitSystem);
	const points = weighIns.map(p => ({ x: p.i / total, y: display(p.w) }));
	// 7-day average at each weigh-in, as the smoothed trend
	const trend = weighIns.map(p => {
		const window = weighIns.filter(q => q.i <= p.i && q.i > p.i - 7);
		return { x: p.i / total, y: display(window.reduce((s, q) => s + q.w, 0) / window.length) };
	});
	const goalDirection =
		data.targets.weight && w.latest ? Math.sign(data.targets.weight - w.latest) : 0;
	const changeColor =
		w.change == null || goalDirection === 0
			? INK
			: Math.sign(w.change) === goalDirection
				? '#5E9A6C'
				: '#C77A5E';
	const unit = weightUnit(unitSystem);

	return (
		<>
			<View className={CARD}>
				<View className="flex-row items-end justify-between">
					<View>
						<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
							Latest
						</Text>
						<Text className="font-JakartaExtraBold text-[30px] text-[#262135]">
							{w.latest != null ? formatWeight(w.latest, unitSystem) : '—'}
						</Text>
					</View>
					{w.change != null && (
						<Text className="font-JakartaBold text-[15px] mb-1.5" style={{ color: changeColor }}>
							{w.change > 0 ? '+' : '−'}
							{display(Math.abs(w.change)).toFixed(1)} {unit}
						</Text>
					)}
				</View>
				<View className="mt-3">
					{points.length > 0 ? (
						<TrendLine
							points={points}
							trend={trend}
							target={data.targets.weight != null ? display(data.targets.weight) : null}
						/>
					) : (
						<Text className="text-sm font-JakartaMedium text-[#574F47] py-8 text-center">
							No weigh-ins in this range.
						</Text>
					)}
				</View>
				<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-2">
					Dots are weigh-ins, the line is your 7-day average
					{data.targets.weight ? ', dashed is your goal' : ''}.
				</Text>
			</View>

			<View className={CARD}>
				<View className="flex-row">
					<Stat
						label="Per week"
						value={
							w.ratePerWeek != null
								? `${w.ratePerWeek > 0 ? '+' : '−'}${display(Math.abs(w.ratePerWeek)).toFixed(1)}`
								: '—'
						}
						sub={w.ratePerWeek != null ? unit : 'needs a week of data'}
					/>
					<Stat label="Weigh-ins" value={`${w.weighInsPerWeek ?? 0}`} sub="per week" />
					<Stat
						label="To goal"
						value={w.toGo != null ? display(Math.abs(w.toGo)).toFixed(1) : '—'}
						sub={
							w.projectedDate
								? `≈ ${shortDate(w.projectedDate)}`
								: w.toGo != null
									? unit
									: 'set a goal'
						}
					/>
				</View>
				{(w.weighInsPerWeek ?? 0) < 3 && (
					<Text className="text-xs font-JakartaMedium text-[#574F47] mt-3">
						Weigh in 3+ times a week for a reliable trend — daily weight swings a lot.
					</Text>
				)}
			</View>
		</>
	);
};

// --- Activity ------------------------------------------------------------------------

const AREA_LABEL: Record<string, string> = {
	chest: 'Chest',
	back: 'Back',
	shoulders: 'Shoulders',
	arms: 'Arms',
	legs: 'Legs',
	glutes: 'Glutes',
	core: 'Core',
};

const Activity = ({ data }: { data: ProgressData }) => {
	const a = data.summary.activity;
	const days = data.days;
	const isWeek = days.length <= 7;

	// Week: one bar per day. Longer: workout days per week, newest week on the right.
	const workoutBars: BarPoint[] = isWeek
		? days.map(d => ({
				value: d.trained ? Math.max(d.workoutMinutes, 20) : 0,
				color: '#7DB88A',
				label: dayLetter(d.date),
			}))
		: Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => {
				const end = days.length - w * 7;
				const chunk = days.slice(Math.max(0, end - 7), end);
				const count = chunk.filter(d => d.trained).length;
				return {
					value: count,
					color: count >= a.weeklyGoal ? '#7DB88A' : ACCENT,
					label: shortDate(chunk[0].date),
				};
			}).reverse();
	const burnBars: BarPoint[] = days.map((d, i) => ({
		value: d.activeCalories,
		color: '#E08585',
		label: barLabel(d, i, days.length),
	}));
	const maxSets = Math.max(1, ...a.muscleBalance.map(m => m.sets));

	return (
		<>
			<View className={CARD}>
				<View className="flex-row">
					<Stat
						label="Workouts"
						value={isWeek ? `${a.workoutDays}/${a.weeklyGoal}` : `${a.workoutsPerWeek ?? 0}`}
						sub={isWeek ? 'days this week' : `a week · goal ${a.weeklyGoal}`}
					/>
					<Stat
						label="Active burn"
						value={a.avgActiveCalories != null ? `${a.avgActiveCalories}` : '—'}
						sub="cal a day"
					/>
					<Stat
						label="Steps"
						value={a.avgSteps != null ? a.avgSteps.toLocaleString() : '—'}
						sub={a.avgSteps != null ? 'a day' : 'not connected'}
					/>
				</View>
			</View>

			<SectionLabel>{isWeek ? 'Workout days' : 'Workout days per week'}</SectionLabel>
			<View className={CARD}>
				<Bars data={workoutBars} target={isWeek ? null : a.weeklyGoal} height={100} />
				{!isWeek && (
					<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-2">
						Dashed line is your goal of {a.weeklyGoal} days a week.
					</Text>
				)}
			</View>

			<SectionLabel>Cardio</SectionLabel>
			<View className={CARD}>
				<View className="flex-row justify-between mb-2">
					<Text className="text-[13px] font-JakartaSemiBold text-[#262135]">
						{a.cardioMinutesPerWeek} min a week
					</Text>
					<Text className="text-xs font-JakartaMedium text-[#574F47]">
						goal {a.cardioWeeklyTarget}
					</Text>
				</View>
				<ProgressBar value={a.cardioMinutesPerWeek} target={a.cardioWeeklyTarget} color="#8FA9BA" />
			</View>

			<SectionLabel>Active calories</SectionLabel>
			<View className={CARD}>
				<Bars data={burnBars} height={90} />
			</View>

			<SectionLabel>Muscle balance</SectionLabel>
			<View className={CARD}>
				{a.muscleBalance.map((m, i) => (
					<View
						key={m.area}
						className={`flex-row items-center ${i < a.muscleBalance.length - 1 ? 'mb-3' : ''}`}
					>
						<Text className="w-20 text-[13px] font-JakartaSemiBold text-[#262135]">
							{AREA_LABEL[m.area]}
						</Text>
						<View className="flex-1 mx-2">
							<ProgressBar value={m.sets} target={maxSets} color={m.sets ? ACCENT : '#F0EBE6'} />
						</View>
						<Text className="w-24 text-right text-[11px] font-JakartaMedium text-[#574F47]">
							{m.sets ? `${m.sets} sets · ${shortDate(m.lastTrained!)}` : 'Not trained'}
						</Text>
					</View>
				))}
			</View>
		</>
	);
};

export default Progress;
