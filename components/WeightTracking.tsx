import { View, Text, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import {
	formatWeight,
	toDisplayWeight,
	toStoredWeight,
	useUnitSystem,
	weightUnit,
} from '@/lib/units';
import { useIsFocused } from '@react-navigation/native';
import ReactNativeModal from 'react-native-modal';
import { fetchAPI, useFetch } from '@/lib/fetch';
import WeightRuler from '@/components/WeightRuler';
import LogWeightModal from '@/components/LogWeightModal';
import CustomButton from '@/components/CustomButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getLocalDate, getTodayDate, parseLocalDate } from '@/lib/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import EditDietModal from '@/components/EditDietModal';
import { formatDietLabel, resolveDietType, resolveFastingSchedule } from '@/lib/diet';
import { useGoalsStore, useQuickLogStore } from '@/store';
import { triggerUserProfileRefresh, useUserProfile } from '@/lib/userUtils';
import { calculateBMI, getBMICategory } from '@/lib/bodyFatUtils';
import SectionTitle from '@/components/progress/SectionTitle';

interface WeightEntry {
	date: string;
	weight: string;
}

interface ChartDataPoint {
	label: string;
	value: number;
	dataPointText: string;
}

const EYEBROW = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;

// BMI bar: 15–40 split at the standard cut-offs, colours from getBMICategory
const BMI_MIN = 15;
const BMI_MAX = 40;
const BMI_SEGMENTS = [
	{ from: 15, to: 18.5, color: '#3B82F6' },
	{ from: 18.5, to: 25, color: '#10B981' },
	{ from: 25, to: 30, color: '#F59E0B' },
	{ from: 30, to: 40, color: '#EF4444' },
];
const bmiPosition = (value: number) =>
	Math.min(1, Math.max(0, (value - BMI_MIN) / (BMI_MAX - BMI_MIN)));

interface WeightTrackingProps {
	onWeightLogged?: () => void;
	onDietChanged?: () => void;
	selectedDate?: string;
}

const WeightTracking = ({ onWeightLogged, onDietChanged, selectedDate }: WeightTrackingProps) => {
	const [rawWeights, setRawWeights] = useState<WeightEntry[]>([]);
	const [userWeights, setUserWeights] = useState<ChartDataPoint[]>([]);
	const [addWeightModal, setAddWeightModal] = useState(false);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [targetWeight, setTargetWeight] = useState<number | null>(null);
	const [startingWeight, setStartingWeight] = useState<number | null>(null);
	const unitSystem = useUnitSystem();
	const [dietModal, setDietModal] = useState(false);
	// Target weight modal (tap the Target number); value in the user's unit
	const [targetModal, setTargetModal] = useState(false);
	const [pendingTarget, setPendingTarget] = useState<number | null>(null);
	const [savingTarget, setSavingTarget] = useState(false);

	const { user } = useUser();
	const userProfile = useUserProfile();
	const { goalsUpdated, resetGoalsUpdate } = useGoalsStore();

	const { getToken } = useAuth();
	const viewDate = selectedDate || getTodayDate();

	const weightDateKey = (date: string) => {
		if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
			return date.slice(0, 10);
		}
		return getLocalDate(new Date(date));
	};

	const toChartPoints = (entries: WeightEntry[]): ChartDataPoint[] =>
		entries.map(({ date, weight }) => {
			const dateObj = parseLocalDate(weightDateKey(date));
			const thisYear = new Date().getFullYear();
			const label =
				dateObj.getFullYear() === thisYear
					? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
					: dateObj.toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: '2-digit',
						});

			return {
				label,
				value: +weight,
				dataPointText: `${weight}`,
			};
		});

	const applyWeightsForDate = (data: WeightEntry[], date: string) => {
		const upToDate = data.filter(entry => weightDateKey(entry.date) <= date);
		setUserWeights(toChartPoints(upToDate.slice(-8)));
	};

	const lastWeightEntry = userWeights.length > 0 ? userWeights[userWeights.length - 1] : null;

	// Check if last weight entry is from today

	// Listen for goals updates and refresh target weight
	useEffect(() => {
		if (goalsUpdated) {
			fetchTargetWeight();
			resetGoalsUpdate();
		}
	}, [goalsUpdated]);

	// Fetch user's target weight and starting weight
	const fetchTargetWeight = async () => {
		if (!user?.id) return;

		try {
			const response = await fetchAPI(`/api/user?clerkId=${user.id}`, {
				method: 'GET',
			});

			if (response.success && response.data) {
				// Target weight and starting weight are already in lbs
				setTargetWeight(response.data.target_weight);
				setStartingWeight(response.data.starting_weight);
			}
		} catch (error) {
			console.error('Failed to fetch target weight:', error);
		}
	};

	useRefetchOnFocus(
		useCallback(() => {
			const fetchData = async () => {
				if (!user?.id) return;

				try {
					const token = await getToken();
					const response = await fetchAPI(`/api/weight?clerkId=${user.id}`, {
						method: 'GET',
						headers: {
							Authorization: `Bearer ${token}`,
							'Content-Type': 'application/json',
						},
					});

					if (!response.data) {
						setRawWeights([]);
						setUserWeights([]);
						return;
					}

					setRawWeights(response.data);
					applyWeightsForDate(response.data, viewDate);
				} catch (error) {
					console.error('Error fetching weight data:', error);
					setRawWeights([]);
					setUserWeights([]);
				}
			};

			fetchData();
			fetchTargetWeight();
		}, [user?.id]),
		user?.id ?? ''
	);

	useEffect(() => {
		applyWeightsForDate(rawWeights, viewDate);
	}, [viewDate, rawWeights]);

	// Open the weight modal when the quick-log FAB requests it (once focused)
	const isFocused = useIsFocused();
	const quickLogPending = useQuickLogStore(s => s.pending);
	const consumeQuickLog = useQuickLogStore(s => s.consume);
	useEffect(() => {
		if (quickLogPending === 'weight' && isFocused && !addWeightModal) {
			setAddWeightModal(true);
			consumeQuickLog();
		}
	}, [quickLogPending, isFocused]);

	const weightValue = lastWeightEntry ? lastWeightEntry.value : null;
	const displayWeight = weightValue !== null ? toDisplayWeight(weightValue, unitSystem) : null;
	const profileWeight = weightValue ?? userProfile.weight ?? null;

	// Start the target ruler on the current target, else the current weight
	useEffect(() => {
		if (!targetModal) {
			setPendingTarget(null);
			return;
		}
		const startLb = Number(targetWeight) || Number(profileWeight) || 150;
		setPendingTarget(Math.round(toDisplayWeight(startLb, unitSystem)));
	}, [targetModal]);

	const handleTargetSubmission = async () => {
		if (pendingTarget === null || !user?.id) return;
		const targetLbs = Math.round(toStoredWeight(pendingTarget, unitSystem) * 10) / 10;
		setSavingTarget(true);
		try {
			// Only the target changes; calorie targets follow the fitness goal, not this
			const response = await fetchAPI('/api/user', {
				method: 'PUT',
				body: JSON.stringify({ clerkId: user.id, targetWeight: targetLbs }),
			});
			if (response.success) {
				setTargetWeight(targetLbs);
				triggerUserProfileRefresh();
				setTargetModal(false);
			}
		} catch (error) {
			console.error('Set target weight error:', error);
		} finally {
			setSavingTarget(false);
		}
	};

	// Difference between the picked target and the current weight, for the modal hint
	const targetDiffLbs =
		pendingTarget !== null && profileWeight
			? toStoredWeight(pendingTarget, unitSystem) - Number(profileWeight)
			: null;

	const heightInches = userProfile.height ? userProfile.height / 2.54 : 0;
	const dietLabel = formatDietLabel(
		resolveDietType(userProfile.dietType),
		resolveFastingSchedule(userProfile.fastingSchedule)
	);
	const bmi = profileWeight && heightInches ? calculateBMI(profileWeight, heightInches) : null;
	const bmiCategory = bmi !== null ? getBMICategory(bmi) : null;

	const losingWeight = Boolean(
		startingWeight && targetWeight && startingWeight > Number(targetWeight)
	);
	const remainingLbs =
		weightValue !== null && targetWeight
			? losingWeight
				? weightValue - Number(targetWeight)
				: Number(targetWeight) - weightValue
			: null;

	const toGoLabel =
		remainingLbs === null
			? null
			: remainingLbs <= 0
				? 'Goal reached'
				: `${formatWeight(remainingLbs, unitSystem)} to go`;

	return (
		<View className="w-full">
			<View className="px-6 mt-12 mb-2">
				<SectionTitle title="Body" tab="weight" />
				<View className="bg-white rounded-3xl border-[1px] border-[#F0EBE6] overflow-hidden">
					<View className="p-4">
						{/* Weight | BMI */}
						<View className="flex-row items-start justify-between">
							<View>
								<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
									Weight
								</Text>
								<View className="flex-row items-baseline mt-1">
									<Text className="font-JakartaExtraBold text-[30px] text-[#262135]">
										{displayWeight !== null ? displayWeight.toFixed(1) : '--'}
									</Text>
									<Text className="font-JakartaMedium text-xs text-[#574F47] ml-1">
										{weightUnit(unitSystem)}
									</Text>
								</View>
							</View>

							<TouchableOpacity
								className="items-end"
								activeOpacity={0.85}
								onPress={() => router.push(bmi !== null ? '/bmi-calculator' : '/edit-profile')}
								accessibilityRole="button"
								accessibilityLabel="Open BMI"
							>
								<View className="flex-row items-center">
									<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
										BMI
									</Text>
									<Ionicons
										name="chevron-forward"
										size={12}
										color="#857869"
										style={{ marginLeft: 2 }}
									/>
								</View>
								<Text className="font-JakartaExtraBold text-[30px] text-[#262135] mt-1">
									{bmi !== null ? bmi.toFixed(1) : '--'}
								</Text>
							</TouchableOpacity>
						</View>

						{bmiCategory && (
							<View className="flex-row justify-end -mt-0.5">
								<View
									className="flex-row items-center px-2 py-0.5 rounded-full"
									style={{ backgroundColor: `${bmiCategory.color}1A` }}
								>
									<View
										className="w-1.5 h-1.5 rounded-full mr-1.5"
										style={{ backgroundColor: bmiCategory.color }}
									/>
									<Text
										className="text-[11px] font-JakartaSemiBold"
										style={{ color: bmiCategory.color }}
									>
										{bmiCategory.category}
									</Text>
								</View>
							</View>
						)}

						{/* BMI along the standard ranges (marker-on-bar) */}
						{bmi !== null && (
							<View className="mt-4">
								<View className="flex-row h-1.5 rounded-full overflow-hidden">
									{BMI_SEGMENTS.map(seg => (
										<View
											key={seg.from}
											style={{
												flex: seg.to - seg.from,
												backgroundColor: seg.color,
												opacity: bmiCategory?.color === seg.color ? 1 : 0.35,
											}}
										/>
									))}
								</View>
								<View
									style={{
										position: 'absolute',
										left: `${bmiPosition(bmi) * 100}%`,
										top: -3,
										marginLeft: -6,
										width: 12,
										height: 12,
										borderRadius: 6,
										backgroundColor: '#262135',
										borderWidth: 2,
										borderColor: '#FFFFFF',
									}}
								/>
								{/* Range boundaries under the bar */}
								<View className="h-4 mt-1">
									{BMI_SEGMENTS.slice(1).map(seg => (
										<Text
											key={seg.from}
											className="text-[10px] font-JakartaMedium text-[#574F47]"
											style={{
												position: 'absolute',
												left: `${bmiPosition(seg.from) * 100}%`,
												width: 32,
												marginLeft: -16,
												textAlign: 'center',
											}}
										>
											{seg.from}
										</Text>
									))}
								</View>
							</View>
						)}

						<View
							className={`flex-row items-end justify-between ${bmi !== null ? 'mt-2' : 'mt-4'}`}
						>
							<View style={{ flex: 1 }}>
								{startingWeight ? (
									<>
										<Text
											className="text-[10px] font-JakartaSemiBold text-[#574F47]"
											style={EYEBROW}
										>
											Start
										</Text>
										<Text className="text-sm font-JakartaBold text-[#262135] mt-1">
											{formatWeight(Number(startingWeight), unitSystem)}
										</Text>
									</>
								) : null}
							</View>
							<View style={{ flex: 1 }} className="items-center">
								{toGoLabel && (
									<Text className="text-xs font-JakartaSemiBold text-[#574F47]">{toGoLabel}</Text>
								)}
							</View>
							<TouchableOpacity
								style={{ flex: 1 }}
								className="items-end"
								activeOpacity={0.7}
								onPress={() => setTargetModal(true)}
								accessibilityRole="button"
								accessibilityLabel="Set target weight"
							>
								<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW}>
									Target
								</Text>
								<View className="flex-row items-center mt-1">
									<Text className="text-sm font-JakartaBold text-[#262135]">
										{targetWeight ? formatWeight(Number(targetWeight), unitSystem) : 'Set target'}
									</Text>
									<Ionicons
										name="chevron-forward"
										size={14}
										color="#857869"
										style={{ marginLeft: 2 }}
									/>
								</View>
							</TouchableOpacity>
						</View>
					</View>

					{/* Diet row */}
					<TouchableOpacity
						className="flex-row items-center px-4 py-3.5 border-t-[1px] border-[#F0EBE6]"
						activeOpacity={0.7}
						onPress={() => setDietModal(true)}
						accessibilityRole="button"
						accessibilityLabel="Edit diet program"
					>
						<View className="w-9 h-9 rounded-full items-center justify-center bg-[#F9F9F8] border-[1px] border-[#F0EBE6]">
							<Ionicons name="restaurant-outline" size={16} color="#262135" />
						</View>
						<Text className="font-JakartaMedium text-[13px] text-[#574F47] ml-3">Diet</Text>
						<Text
							className="flex-1 text-right font-JakartaSemiBold text-[14px] text-[#262135]"
							numberOfLines={1}
						>
							{dietLabel}
						</Text>
						<Ionicons name="chevron-forward" size={16} color="#857869" style={{ marginLeft: 4 }} />
					</TouchableOpacity>
				</View>

				<LogWeightModal
					isVisible={addWeightModal}
					date={viewDate}
					startWeightLb={profileWeight}
					onClose={() => setAddWeightModal(false)}
					onLogged={onWeightLogged}
				/>

				<ReactNativeModal isVisible={targetModal} onBackdropPress={() => setTargetModal(false)}>
					<View className="bg-white py-14 px-4 mx-0 rounded-md">
						<View className="pb-4">
							<Text className="text-xl text-center font-JakartaSemiBold">Set target weight</Text>
							<Text className="text-[13px] text-center font-JakartaMedium text-[#574F47] mt-2">
								{targetDiffLbs === null || Math.abs(targetDiffLbs) < 0.1
									? 'Slide to pick your goal weight'
									: `${formatWeight(Math.abs(targetDiffLbs), unitSystem)} to ${
											targetDiffLbs < 0 ? 'lose' : 'gain'
										} from ${formatWeight(Number(profileWeight), unitSystem)}`}
							</Text>
						</View>

						<View className="flex mx-auto my-8 w-full justify-center">
							{pendingTarget !== null && (
								<WeightRuler
									value={pendingTarget}
									min={unitSystem === 'metric' ? 25 : 50}
									max={unitSystem === 'metric' ? 230 : 500}
									unit={weightUnit(unitSystem)}
									onChange={setPendingTarget}
								/>
							)}
						</View>

						<CustomButton
							onPress={handleTargetSubmission}
							title={savingTarget ? 'Saving…' : 'Save target'}
							disabled={savingTarget}
						/>
					</View>
				</ReactNativeModal>

				<EditDietModal
					isVisible={dietModal}
					onClose={() => setDietModal(false)}
					onSaved={onDietChanged}
				/>
			</View>
		</View>
	);
};

export default WeightTracking;
