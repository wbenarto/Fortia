import { useState, useEffect, useMemo } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	TextInput,
	ActivityIndicator,
	LayoutAnimation,
	Platform,
	UIManager,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { fetchAPI } from '@/lib/fetch';
import {
	calculateBMI,
	getBMICategory,
	calculateBodyFatPercentage,
	getBodyFatCategory,
	getHealthyWeightRangeLbs,
} from '@/lib/bodyFatUtils';
import { SCREEN_BG } from '@/lib/theme';
import { toDisplayWeight, toStoredWeight, useUnitSystem, weightUnit } from '@/lib/units';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface UserRow {
	weight: number;
	height: number; // cm
	age: number;
	gender: string;
	target_weight?: number;
}

interface WeightEntry {
	weight: number;
	date: string;
}

const GAUGE_MIN = 15;
const GAUGE_MAX = 45;
const BANDS = [
	{ from: 15, to: 18.5, color: '#3B82F6' },
	{ from: 18.5, to: 25, color: '#10B981' },
	{ from: 25, to: 30, color: '#F59E0B' },
	{ from: 30, to: 45, color: '#EF4444' },
];

const CX = 130;
const CY = 140;
const R = 100;
const STROKE = 18;

function angleForBmi(bmi: number) {
	const clamped = Math.min(Math.max(bmi, GAUGE_MIN), GAUGE_MAX);
	return 180 - ((clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 180;
}

function pointOnArc(angleDeg: number, radius: number = R) {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: CX + radius * Math.cos(rad),
		y: CY - radius * Math.sin(rad),
	};
}

function arcPath(fromAngle: number, toAngle: number) {
	const start = pointOnArc(fromAngle);
	const end = pointOnArc(toAngle);
	const largeArc = fromAngle - toAngle > 180 ? 1 : 0;
	return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const BmiCalculator = () => {
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const [profile, setProfile] = useState<UserRow | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	// The stepper is in the user's unit; BMI math below runs on lbs
	const [weightInput, setWeightInput] = useState('');
	const unitSystem = useUnitSystem();
	const unit = weightUnit(unitSystem);
	const toInput = (lb: number) => String(Math.round(toDisplayWeight(lb, unitSystem)));
	const inUnit = (lb: number) => Math.round(toDisplayWeight(lb, unitSystem));
	const [history, setHistory] = useState<WeightEntry[]>([]);
	const [showAbout, setShowAbout] = useState(false);

	useEffect(() => {
		const load = async () => {
			if (!user?.id) return;
			try {
				const [userRes, weightRes] = await Promise.all([
					fetchAPI(`/api/user?clerkId=${user.id}`, { method: 'GET' }),
					fetchAPI(`/api/weight?clerkId=${user.id}`, { method: 'GET' }),
				]);
				if (userRes.success && userRes.data) {
					setProfile(userRes.data);
					setWeightInput(userRes.data.weight ? toInput(userRes.data.weight) : '');
				}
				if (weightRes?.data) {
					setHistory(weightRes.data);
				}
			} catch (error) {
				console.error('Failed to load BMI data:', error);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, [user?.id]);

	const heightInches = profile?.height ? profile.height / 2.54 : 0;
	const inputWeight = parseFloat(weightInput) || 0;
	const weight = toStoredWeight(inputWeight, unitSystem);
	const isWhatIf = Boolean(profile?.weight && inUnit(profile.weight) !== inputWeight);

	const bmi = weight && heightInches ? calculateBMI(weight, heightInches) : 0;
	const category = bmi ? getBMICategory(bmi) : null;
	const range = heightInches ? getHealthyWeightRangeLbs(heightInches) : { min: 0, max: 0 };

	const bodyFat =
		weight && heightInches && profile?.age && profile?.gender
			? calculateBodyFatPercentage(weight, heightInches, profile.age, profile.gender)
			: 0;
	const bodyFatCategory =
		bodyFat && profile?.age && profile?.gender
			? getBodyFatCategory(bodyFat, profile.age, profile.gender)
			: null;

	const angle = angleForBmi(bmi || GAUGE_MIN);
	const marker = pointOnArc(angle);

	const adjustWeight = (delta: number) => {
		const next = Math.max(1, Math.round((inputWeight || 0) + delta));
		setWeightInput(String(next));
	};

	const resetWeight = () => {
		if (profile?.weight) setWeightInput(toInput(profile.weight));
	};

	const useGoalWeight = () => {
		if (profile?.target_weight) setWeightInput(toInput(profile.target_weight));
	};

	let rangeLabel = '';
	let rangeGood = false;
	if (range.min && range.max && weight) {
		if (weight < range.min) {
			rangeLabel = `${inUnit(range.min - weight)} ${unit} below the healthy range`;
		} else if (weight > range.max) {
			rangeLabel = `${inUnit(weight - range.max)} ${unit} above the healthy range`;
		} else {
			rangeLabel = 'Within the healthy range';
			rangeGood = true;
		}
	}

	const trend = useMemo(() => {
		if (!heightInches || history.length < 2) return null;
		const points = history.map(h => ({
			date: h.date,
			bmi: calculateBMI(h.weight, heightInches),
		}));
		const values = points.map(p => p.bmi);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const span = Math.max(max - min, 1);
		const width = 280;
		const height = 64;
		const coords = points.map((p, i) => ({
			x: (i / (points.length - 1)) * width,
			y: height - ((p.bmi - min) / span) * height,
		}));
		const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
		const area = `${line} L ${width} ${height} L 0 ${height} Z`;
		return { coords, line, area, width, height, first: points[0], last: points[points.length - 1] };
	}, [history, heightInches]);

	const toggleAbout = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setShowAbout(v => !v);
	};

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center" style={{ backgroundColor: SCREEN_BG }}>
				<Stack.Screen options={{ headerShown: false }} />
				<ActivityIndicator size="large" color="#E3BBA1" />
			</View>
		);
	}

	if (!profile?.weight || !profile?.height) {
		return (
			<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
				<Stack.Screen options={{ headerShown: false }} />
				<View className="flex-row items-center px-5 py-3">
					<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
						<Ionicons name="chevron-back" size={26} color="#262135" />
					</TouchableOpacity>
				</View>
				<View className="flex-1 items-center justify-center px-8">
					<Ionicons name="speedometer-outline" size={40} color="#857869" />
					<Text className="font-JakartaSemiBold text-[#262135] text-base mt-4 text-center">
						Add your height & weight to see your BMI
					</Text>
					<TouchableOpacity
						onPress={() => router.push('/edit-profile')}
						className="bg-[#E3BBA1] px-6 py-3 rounded-xl mt-5"
					>
						<Text className="text-white font-JakartaSemiBold">Complete profile</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1" style={{ backgroundColor: SCREEN_BG, paddingTop: insets.top }}>
			<Stack.Screen options={{ headerShown: false }} />

			<View className="flex-row items-center justify-between px-5 py-3">
				<TouchableOpacity onPress={() => router.back()} hitSlop={10}>
					<Ionicons name="chevron-back" size={26} color="#262135" />
				</TouchableOpacity>
				<Text className="font-JakartaSemiBold text-[#262135] text-base">BMI</Text>
				<View style={{ width: 26 }} />
			</View>

			<ScrollView
				contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
				showsVerticalScrollIndicator={false}
			>
				<View className="items-center">
					<Svg width={CX * 2} height={CY + 20}>
						{BANDS.map((band, i) => (
							<Path
								key={i}
								d={arcPath(angleForBmi(band.from), angleForBmi(band.to))}
								stroke={band.color}
								strokeWidth={STROKE}
								fill="none"
								strokeLinecap="butt"
								opacity={0.7}
							/>
						))}
						<Circle cx={marker.x} cy={marker.y} r={9} fill="#FFFFFF" />
						<Circle cx={marker.x} cy={marker.y} r={6} fill="#262135" />
					</Svg>
					<View style={{ position: 'absolute', top: CY - 34, left: 0, right: 0, alignItems: 'center' }}>
						<Text className="font-JakartaExtraBold text-[#262135]" style={{ fontSize: 40 }}>
							{bmi ? bmi.toFixed(1) : '--'}
						</Text>
						{category && (
							<View
								style={{ backgroundColor: `${category.color}1F` }}
								className="px-3 py-1 rounded-full mt-1"
							>
								<Text style={{ color: category.color }} className="text-xs font-JakartaSemiBold">
									{category.category}
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* What-if weight control */}
				<View className="bg-[#F9F9F8] border border-[#F0EBE6] rounded-3xl p-4 mt-2">
					<View className="flex-row items-center justify-between mb-1">
						<Text
							className="text-[11px] font-JakartaSemiBold text-[#574F47]"
							style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
						>
							{isWhatIf ? 'At this weight' : 'Your weight'}
						</Text>
						{isWhatIf && (
							<TouchableOpacity onPress={resetWeight}>
								<Text className="text-xs font-JakartaSemiBold" style={{ color: '#C98B67' }}>
									Reset
								</Text>
							</TouchableOpacity>
						)}
					</View>
					<View className="flex-row items-center justify-center mt-1">
						<TouchableOpacity
							onPress={() => adjustWeight(-1)}
							className="w-10 h-10 rounded-full bg-white border border-[#EFE7DF] items-center justify-center"
						>
							<Ionicons name="remove" size={18} color="#262135" />
						</TouchableOpacity>
						<View className="flex-row items-baseline mx-4">
							<TextInput
								value={weightInput}
								onChangeText={t => setWeightInput(t.replace(/[^0-9]/g, ''))}
								keyboardType="number-pad"
								className="font-JakartaBold text-[#262135] text-center"
								style={{ fontSize: 26, minWidth: 56 }}
							/>
							<Text className="text-[#574F47] font-JakartaMedium ml-1">{unit}</Text>
						</View>
						<TouchableOpacity
							onPress={() => adjustWeight(1)}
							className="w-10 h-10 rounded-full bg-white border border-[#EFE7DF] items-center justify-center"
						>
							<Ionicons name="add" size={18} color="#262135" />
						</TouchableOpacity>
					</View>
					{Boolean(profile.target_weight) && (
						<TouchableOpacity onPress={useGoalWeight} className="self-center mt-3">
							<Text className="text-xs font-JakartaSemiBold" style={{ color: '#C98B67' }}>
								See BMI at your goal weight ({inUnit(profile.target_weight!)} {unit})
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Healthy range */}
				<View className="bg-white border border-[#F0EBE6] rounded-3xl p-4 mt-3">
					<View className="flex-row items-center mb-2">
						<Ionicons name="resize-outline" size={16} color="#C98B67" />
						<Text className="font-JakartaSemiBold text-[#262135] text-sm ml-2">
							Healthy weight range
						</Text>
					</View>
					<Text className="text-[#262135] font-JakartaBold text-lg">
						{inUnit(range.min)}–{inUnit(range.max)} {unit}
					</Text>
					<Text className="text-xs mt-1" style={{ color: rangeGood ? '#10B981' : '#574F47' }}>
						{rangeLabel || 'Based on your height, for a BMI of 18.5–24.9'}
					</Text>
				</View>

				{/* Body fat */}
				{bodyFat > 0 && bodyFatCategory && (
					<View className="bg-white border border-[#F0EBE6] rounded-3xl p-4 mt-3">
						<View className="flex-row items-center justify-between">
							<View className="flex-row items-center">
								<Ionicons name="analytics-outline" size={16} color="#C98B67" />
								<Text className="font-JakartaSemiBold text-[#262135] text-sm ml-2">
									Estimated body fat
								</Text>
							</View>
							<View
								style={{ backgroundColor: `${bodyFatCategory.color}1F` }}
								className="px-2.5 py-1 rounded-full"
							>
								<Text
									style={{ color: bodyFatCategory.color }}
									className="text-xs font-JakartaSemiBold"
								>
									{bodyFatCategory.category}
								</Text>
							</View>
						</View>
						<Text className="text-[#262135] font-JakartaBold text-lg mt-2">{bodyFat}%</Text>
						<Text className="text-[#574F47] text-xs mt-1">
							BMI can't tell muscle from fat — this estimate can, using your weight, height, age,
							and sex.
						</Text>
					</View>
				)}

				{/* Trend */}
				<View className="bg-white border border-[#F0EBE6] rounded-3xl p-4 mt-3">
					<Text className="font-JakartaSemiBold text-[#262135] text-sm mb-3">BMI trend</Text>
					{trend ? (
						<View>
							<Svg width={trend.width} height={trend.height + 6}>
								<Defs>
									<SvgLinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
										<Stop offset="0%" stopColor="#E3BBA1" stopOpacity="0.35" />
										<Stop offset="100%" stopColor="#E3BBA1" stopOpacity="0" />
									</SvgLinearGradient>
								</Defs>
								<Path d={trend.area} fill="url(#trendFill)" />
								<Path d={trend.line} stroke="#C98B67" strokeWidth={2} fill="none" />
								<Circle
									cx={trend.coords[trend.coords.length - 1].x}
									cy={trend.coords[trend.coords.length - 1].y}
									r={4}
									fill="#C98B67"
								/>
							</Svg>
							<View className="flex-row justify-between mt-1">
								<Text className="text-[10px] text-[#574F47]">{trend.first.date}</Text>
								<Text className="text-[10px] text-[#574F47]">{trend.last.date}</Text>
							</View>
						</View>
					) : (
						<Text className="text-[#574F47] text-xs">
							Log your weight a few times to see how your BMI changes over time.
						</Text>
					)}
				</View>

				{/* About */}
				<TouchableOpacity
					onPress={toggleAbout}
					className="bg-[#F9F9F8] border border-[#F0EBE6] rounded-3xl p-4 mt-3"
					activeOpacity={0.8}
				>
					<View className="flex-row items-center justify-between">
						<Text className="font-JakartaSemiBold text-[#262135] text-sm">
							What BMI doesn't tell you
						</Text>
						<Ionicons name={showAbout ? 'chevron-up' : 'chevron-down'} size={18} color="#574F47" />
					</View>
					{showAbout && (
						<Text className="text-[#6B6478] text-xs leading-5 mt-3">
							BMI only looks at weight relative to height — it can't tell muscle from fat, so a
							muscular person can read "overweight" while carrying very little body fat. It also
							doesn't account for age, sex, or where fat is carried, and the standard ranges shown
							here were developed mainly on European populations — some health bodies use lower
							cutoffs for South and East Asian ancestry. Use it as one data point, not a verdict.
						</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
};

export default BmiCalculator;
