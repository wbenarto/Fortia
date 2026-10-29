import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import ReactNativeModal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { calculateMacros } from '@/lib/nutritionTargets';
import { triggerUserProfileRefresh, useUserProfile } from '@/lib/userUtils';
import {
	DIET_INFO,
	DIET_TYPES,
	FASTING_INFO,
	FASTING_SCHEDULES,
	formatDietSplit,
	formatEatingWindow,
	formatHour,
	resolveDietType,
	resolveFastingSchedule,
	resolveFastingStartHour,
	type DietType,
	type FastingSchedule,
} from '@/lib/diet';

const ACCENT = '#E3BBA1';
const EYEBROW_STYLE = { textTransform: 'uppercase', letterSpacing: 0.6 } as const;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// Diet type sets the macro split (calories still come from the fitness goal);
// fasting only sets an eating window and never changes targets.
const EditDietModal = ({
	isVisible,
	onClose,
	onSaved,
}: {
	isVisible: boolean;
	onClose: () => void;
	onSaved?: () => void;
}) => {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const profile = useUserProfile();
	const [diet, setDiet] = useState<DietType>('balanced');
	const [schedule, setSchedule] = useState<FastingSchedule>('off');
	const [startHour, setStartHour] = useState(12);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!isVisible) return;
		setDiet(resolveDietType(profile.dietType));
		setSchedule(resolveFastingSchedule(profile.fastingSchedule));
		setStartHour(resolveFastingStartHour(profile.fastingStartHour));
		setError('');
	}, [isVisible]);

	// Preview of the macro targets this diet would give at the current calorie target
	const dailyCalories = Number(profile.dailyCalories) || 0;
	const preview = dailyCalories
		? calculateMacros(dailyCalories, diet, Number(profile.weight))
		: null;
	const eatingWindow = formatEatingWindow(schedule, startHour);

	const save = async () => {
		if (!user?.id) return;
		setIsSaving(true);
		setError('');
		try {
			const response = await fetchAPI('/api/user', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clerkId: user.id,
					dietType: diet,
					fastingSchedule: schedule,
					fastingStartHour: startHour,
				}),
			});
			if (!response.success) {
				setError(response.error || 'Failed to save diet');
				return;
			}
			triggerUserProfileRefresh();
			onSaved?.();
			onClose();
		} catch (err) {
			console.error('Save diet error:', err);
			setError('Failed to save diet. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			className="m-0 justify-end"
		>
			<View className="bg-white rounded-t-3xl" style={{ maxHeight: '90%' }}>
				<ScrollView
					contentContainerStyle={{ padding: 24, paddingBottom: 8 }}
					showsVerticalScrollIndicator={false}
				>
					<View className="flex-row justify-between items-center mb-5">
						<Text className="text-xl font-JakartaExtraBold text-[#262135]">Diet program</Text>
						<TouchableOpacity onPress={onClose} hitSlop={10}>
							<Ionicons name="close" size={24} color="#334155" />
						</TouchableOpacity>
					</View>

					{/* Diet type */}
					<Text
						className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-2"
						style={EYEBROW_STYLE}
					>
						Diet type
					</Text>
					<View style={{ rowGap: 8 }}>
						{DIET_TYPES.map(type => {
							const selected = diet === type;
							return (
								<TouchableOpacity
									key={type}
									onPress={() => setDiet(type)}
									activeOpacity={0.8}
									accessibilityRole="radio"
									accessibilityState={{ selected }}
									className="flex-row items-center rounded-2xl px-4 py-3 border-[1px]"
									style={{
										borderColor: selected ? ACCENT : '#F0EBE6',
										backgroundColor: selected ? `${ACCENT}1F` : '#FFFFFF',
									}}
								>
									<View className="flex-1 pr-3">
										<Text className="text-sm font-JakartaBold text-[#262135]">
											{DIET_INFO[type].label}
										</Text>
										<Text className="text-xs font-JakartaMedium text-[#574F47] mt-0.5">
											{DIET_INFO[type].description}
										</Text>
									</View>
									<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mr-3">
										{formatDietSplit(type)}
									</Text>
									<Ionicons
										name={selected ? 'checkmark-circle' : 'ellipse-outline'}
										size={20}
										color={selected ? ACCENT : '#857869'}
									/>
								</TouchableOpacity>
							);
						})}
					</View>
					<Text className="text-[11px] font-JakartaMedium text-[#574F47] mt-2">
						Protein / carbs / fat, as % of calories.
					</Text>

					{preview && (
						<View className="flex-row justify-between bg-[#F9F9F8] border-[1px] border-[#F0EBE6] rounded-2xl px-4 py-3 mt-4">
							<PreviewStat label="Calories" value={dailyCalories} unit="kcal" />
							<PreviewStat label="Protein" value={preview.dailyProtein} unit="g" />
							<PreviewStat label="Carbs" value={preview.dailyCarbs} unit="g" />
							<PreviewStat label="Fat" value={preview.dailyFats} unit="g" />
						</View>
					)}

					{/* Fasting */}
					<Text
						className="text-[11px] font-JakartaSemiBold text-[#574F47] mt-7 mb-2"
						style={EYEBROW_STYLE}
					>
						Intermittent fasting
					</Text>
					<View className="flex-row flex-wrap" style={{ gap: 8 }}>
						{FASTING_SCHEDULES.map(option => {
							const selected = schedule === option;
							return (
								<TouchableOpacity
									key={option}
									onPress={() => setSchedule(option)}
									accessibilityRole="radio"
									accessibilityState={{ selected }}
									className={`px-4 py-2 rounded-full ${selected ? 'bg-[#E3BBA1]' : 'bg-[#F1F1F1]'}`}
								>
									<Text
										className={`text-xs font-JakartaSemiBold ${
											selected ? 'text-white' : 'text-[#334155]'
										}`}
									>
										{FASTING_INFO[option].label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
					<Text className="text-xs font-JakartaMedium text-[#574F47] mt-2">
						{FASTING_INFO[schedule].description}
						{schedule !== 'off' ? '. Your calorie and macro targets stay the same.' : ''}
					</Text>

					{schedule !== 'off' && (
						<>
							<View className="flex-row justify-between items-baseline mt-5 mb-2">
								<Text
									className="text-[11px] font-JakartaSemiBold text-[#574F47]"
									style={EYEBROW_STYLE}
								>
									Eating window starts
								</Text>
								<Text className="text-sm font-JakartaBold text-[#262135]">{eatingWindow}</Text>
							</View>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{ columnGap: 8 }}
							>
								{HOURS.map(hour => {
									const selected = startHour === hour;
									return (
										<TouchableOpacity
											key={hour}
											onPress={() => setStartHour(hour)}
											className={`px-3 py-2 rounded-full ${
												selected ? 'bg-[#E3BBA1]' : 'bg-[#F1F1F1]'
											}`}
										>
											<Text
												className={`text-xs font-JakartaSemiBold ${
													selected ? 'text-white' : 'text-[#334155]'
												}`}
											>
												{formatHour(hour)}
											</Text>
										</TouchableOpacity>
									);
								})}
							</ScrollView>
						</>
					)}

					{error ? <Text className="text-xs text-[#E08585] mt-4">{error}</Text> : null}
				</ScrollView>

				<View className="px-6 pt-3" style={{ paddingBottom: 24 + insets.bottom }}>
					<TouchableOpacity
						onPress={save}
						disabled={isSaving}
						className={`rounded-xl py-3 ${isSaving ? 'bg-[#F1F1F1]' : 'bg-[#E3BBA1]'}`}
					>
						{isSaving ? (
							<ActivityIndicator size="small" color={ACCENT} />
						) : (
							<Text className="text-white text-center font-JakartaSemiBold">Save</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</ReactNativeModal>
	);
};

const PreviewStat = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
	<View>
		<Text className="text-[10px] font-JakartaSemiBold text-[#574F47]" style={EYEBROW_STYLE}>
			{label}
		</Text>
		<View className="flex-row items-baseline mt-0.5">
			<Text className="font-JakartaExtraBold text-[16px] text-[#262135]">{Math.round(value)}</Text>
			<Text className="font-JakartaMedium text-[10px] text-[#574F47] ml-0.5">{unit}</Text>
		</View>
	</View>
);

export default EditDietModal;
