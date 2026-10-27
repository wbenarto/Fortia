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
import CustomButton from '@/components/CustomButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-gifted-charts';
import { getLocalDate, getTodayDate, parseLocalDate } from '@/lib/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import EditDietModal from '@/components/EditDietModal';
import { formatDietLabel, resolveDietType, resolveFastingSchedule } from '@/lib/diet';
import { useGoalsStore, useQuickLogStore } from '@/store';
import { triggerUserProfileRefresh, useUserProfile } from '@/lib/userUtils';
import { calculateBMI, getBMICategory } from '@/lib/bodyFatUtils';
import { SCREEN_BG } from '@/lib/theme';
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

interface WeightTrackingProps {
	onWeightLogged?: () => void;
	onDietChanged?: () => void;
	selectedDate?: string;
}

const CHART_WIDTH = 260;

const WeightTracking = ({ onWeightLogged, onDietChanged, selectedDate }: WeightTrackingProps) => {
	const [rawWeights, setRawWeights] = useState<WeightEntry[]>([]);
	const [userWeights, setUserWeights] = useState<ChartDataPoint[]>([]);
	const [addWeightModal, setAddWeightModal] = useState(false);
	// Weight picked on the ruler, in the user's unit
	const [pendingWeight, setPendingWeight] = useState<number | null>(null);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [focusedPoint, setFocusedPoint] = useState(null);
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

	// Calculate yAxisOffset based on data range
	const calculateYAxisOffset = (data: ChartDataPoint[]) => {
		if (data.length === 0) return 140;

		const range = data[data.length - 1].value;

		// Adjust offset based on data range
		if (range < 100) return 60; // Small range
		if (range < 140) return 100; // Medium range
		if (range < 180) return 140; // Large range
		return 170; // Very large range
	};

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

	const handleWeightSubmission = async () => {
		// Handle weight form submission

		// Validate weight input
		if (pendingWeight === null || isNaN(pendingWeight)) {
			console.error('Invalid weight input');
			return;
		}

		try {
			const dateString = viewDate;

			await fetchAPI('/api/weight', {
				method: 'POST',
				body: JSON.stringify({
					// Entered in the user's unit; stored in lbs
					weight: Math.round(toStoredWeight(pendingWeight, unitSystem) * 10) / 10,
					date: dateString,
					clerkId: user?.id,
				}),
			});

			// Add a small delay to ensure the database has been updated
			await new Promise(resolve => setTimeout(resolve, 100));

			const fetchData = async () => {
				const token = await getToken();
				const response = await fetchAPI(`/api/weight?clerkId=${user?.id}`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				});

				const data = response.data;

				// Process weight data for chart (same logic as above)
				if (!data) {
					setRawWeights([]);
					setUserWeights([]);
					return;
				}

				setRawWeights(data);
				applyWeightsForDate(data, viewDate);
			};

			fetchData();
			setAddWeightModal(false);

			// Trigger quest refresh callback
			onWeightLogged?.();
		} catch (error) {
			console.error('Weight logging error:', error);
		}
	};
	const weightValue = lastWeightEntry ? lastWeightEntry.value : null;
	const displayWeight = weightValue !== null ? toDisplayWeight(weightValue, unitSystem) : null;
	const profileWeight = weightValue ?? userProfile.weight ?? null;

	// Start the ruler on the current weight (latest log, else profile, else a typical value)
	useEffect(() => {
		if (!addWeightModal) {
			setPendingWeight(null);
			return;
		}
		const currentLb = Number(profileWeight) || 150;
		setPendingWeight(Math.round(toDisplayWeight(currentLb, unitSystem) * 10) / 10);
	}, [addWeightModal]);
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
				<View className="flex-row items-stretch">
					<View className="flex-1">
						<Text
							className="text-[10px] font-JakartaSemiBold text-[#94897E]"
							style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
						>
							Weight
						</Text>
						<View className="flex-row items-baseline mt-1">
							<Text className="font-JakartaExtraBold text-[30px] text-[#262135]">
								{displayWeight !== null ? displayWeight.toFixed(1) : '--'}
							</Text>
							<Text className="font-JakartaMedium text-xs text-[#94897E] ml-1">
								{weightUnit(unitSystem)}
							</Text>
						</View>
						{toGoLabel && (
							<Text className="text-xs font-JakartaSemiBold text-[#94897E] mt-1">{toGoLabel}</Text>
						)}
					</View>

					<View className="w-px bg-[#F0EBE6] mx-4" />

					<TouchableOpacity
						className="flex-1 items-end"
						activeOpacity={0.85}
						onPress={() => router.push(bmi !== null ? '/bmi-calculator' : '/edit-profile')}
					>
						<View className="flex-row items-center">
							<Text
								className="text-[10px] font-JakartaSemiBold text-[#94897E]"
								style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
							>
								BMI
							</Text>
							<Ionicons
								name="chevron-forward"
								size={12}
								color="#C9BEB4"
								style={{ marginLeft: 2 }}
							/>
						</View>
						<Text className="font-JakartaExtraBold text-[30px] text-[#262135] mt-1">
							{bmi !== null ? bmi.toFixed(1) : '--'}
						</Text>
						{bmiCategory && (
							<Text
								className="text-xs font-JakartaSemiBold mt-1"
								style={{ color: bmiCategory.color }}
							>
								{bmiCategory.category}
							</Text>
						)}
					</TouchableOpacity>
				</View>

				<View className="h-[1px] bg-[#F0EBE6] my-4" />

				<View className="h-24 flex-row items-center justify-center">
					{userWeights.length > 0 ? (
						<>
							<View className="overflow-hidden" style={{ width: CHART_WIDTH }}>
								<LineChart
									color={'#E3BBA1'}
									data={userWeights.map((point, index) =>
										index === userWeights.length - 1
											? {
													...point,
													customDataPoint: () => (
														<View
															style={{
																width: 10,
																height: 10,
																borderRadius: 5,
																backgroundColor: '#E3BBA1',
																borderWidth: 2,
																borderColor: SCREEN_BG,
															}}
														/>
													),
												}
											: point
									)}
									height={80}
									width={CHART_WIDTH}
									curved
									textColor={'transparent'}
									spacing={30}
									thickness={3}
									xAxisLabelTextStyle={{ color: 'transparent', fontSize: 12 }}
									yAxisTextStyle={{ color: 'transparent', fontSize: 12 }}
									hideYAxisText
									hideAxesAndRules
									focusEnabled
									showDataPointOnFocus
									focusedDataPointShape="circle"
									focusedDataPointWidth={15}
									focusedDataPointHeight={15}
									focusedDataPointColor="#E3BBA1"
									focusedDataPointRadius={6}
									onFocus={(item: any) => {
										setFocusedPoint(item);
									}}
									yAxisOffset={calculateYAxisOffset(userWeights)}
								/>
							</View>
							<View className="ml-2 items-start">
								<Text
									className="text-[10px] font-JakartaSemiBold text-[#94897E]"
									style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
								>
									Now
								</Text>
								<Text className="text-xs font-JakartaBold text-[#262135]">
									{displayWeight !== null ? displayWeight.toFixed(1) : '--'}
								</Text>
							</View>
						</>
					) : (
						<View className="h-[100px] flex justify-center items-center">
							<Text className="text-gray-400 text-sm">No weight data available</Text>
						</View>
					)}
				</View>

				<View className="flex-row justify-between items-end mt-1">
					<TouchableOpacity
						activeOpacity={0.7}
						onPress={() => setTargetModal(true)}
						accessibilityRole="button"
						accessibilityLabel="Set target weight"
					>
						<Text
							className="text-[10px] font-JakartaSemiBold text-[#94897E]"
							style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
						>
							Target
						</Text>
						<View className="flex-row items-center mt-1">
							<Text className="text-sm font-JakartaBold text-[#262135]">
								{targetWeight ? formatWeight(Number(targetWeight), unitSystem) : 'Set target'}
							</Text>
							<Ionicons
								name="chevron-forward"
								size={14}
								color="#C9BEB4"
								style={{ marginLeft: 2 }}
							/>
						</View>
					</TouchableOpacity>
					<TouchableOpacity
						className="items-end"
						activeOpacity={0.7}
						onPress={() => setDietModal(true)}
						accessibilityRole="button"
						accessibilityLabel="Edit diet program"
					>
						<Text
							className="text-[10px] font-JakartaSemiBold text-[#94897E]"
							style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
						>
							Diet
						</Text>
						<View className="flex-row items-center mt-1">
							<Text className="text-sm font-JakartaBold text-[#262135]">{dietLabel}</Text>
							<Ionicons
								name="chevron-forward"
								size={14}
								color="#C9BEB4"
								style={{ marginLeft: 2 }}
							/>
						</View>
					</TouchableOpacity>
				</View>

				<ReactNativeModal
					isVisible={addWeightModal}
					onBackdropPress={() => setAddWeightModal(false)}
				>
					<View className="bg-white py-14 px-4 mx-0 rounded-md">
						<View className="pb-4 ">
							<Text className="text-xl text-center font-JakartaSemiBold">Log your weight</Text>
						</View>

						<View className="flex mx-auto  my-8 w-full justify-center">
							{pendingWeight !== null && (
								<WeightRuler
									value={pendingWeight}
									min={unitSystem === 'metric' ? 25 : 50}
									max={unitSystem === 'metric' ? 230 : 500}
									unit={weightUnit(unitSystem)}
									onChange={setPendingWeight}
								/>
							)}
						</View>

						<CustomButton onPress={handleWeightSubmission} title="Save" />
					</View>
				</ReactNativeModal>

				<ReactNativeModal isVisible={targetModal} onBackdropPress={() => setTargetModal(false)}>
					<View className="bg-white py-14 px-4 mx-0 rounded-md">
						<View className="pb-4">
							<Text className="text-xl text-center font-JakartaSemiBold">Set target weight</Text>
							<Text className="text-[13px] text-center font-JakartaMedium text-[#94897E] mt-2">
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
