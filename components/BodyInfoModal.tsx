import { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import ReactNativeModal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { fetchAPI } from '@/lib/fetch';
import { getTodayDate } from '@/lib/dateUtils';
import { triggerUserProfileRefresh } from '@/lib/userUtils';
import { useGoalsStore } from '@/store';
import {
	cmToFeetInches,
	feetInchesToCm,
	toDisplayWeight,
	toStoredWeight,
	useUnitSystem,
	weightUnit,
} from '@/lib/units';

const EYEBROW_STYLE = { letterSpacing: 0.6, textTransform: 'uppercase' as const };

interface Props {
	isVisible: boolean;
	onClose: () => void;
	onSaved: () => void;
	// Current values from the DB (weight lb, height cm, dob date string)
	dob?: string | null;
	weight?: number | string | null;
	height?: number | string | null;
}

// "1990-05-01" or an ISO timestamp → local Date (no timezone shift)
const parseDob = (dob?: string | null) => {
	const match = dob?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return new Date(1995, 0, 1);
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const toDateString = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ageFrom = (birth: Date) => {
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const m = today.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
	return age;
};

const formatDob = (d: Date) =>
	d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const NumberBox = ({
	value,
	onChangeText,
	unit,
	placeholder,
	grow,
}: {
	value: string;
	onChangeText: (v: string) => void;
	unit: string;
	placeholder?: string;
	// Share a row with another box
	grow?: boolean;
}) => (
	<View
		style={grow ? { flex: 1 } : undefined}
		className="flex-row items-center bg-[#F9F9F8] border-[1px] border-[#F0EBE6] rounded-2xl px-4 py-3"
	>
		<TextInput
			value={value}
			onChangeText={onChangeText}
			keyboardType="decimal-pad"
			placeholder={placeholder}
			placeholderTextColor="#857869"
			className="flex-1 font-JakartaBold text-[18px] text-[#262135]"
			style={{ padding: 0 }}
		/>
		<Text className="font-JakartaMedium text-[13px] text-[#574F47] ml-2">{unit}</Text>
	</View>
);

// Bottom sheet for the "About You" card: birthday, weight and height.
// Changing weight logs a weigh-in for today (so it shows in weight history);
// birthday and height go through PUT /api/user. Both recalculate targets server side.
const BodyInfoModal = ({ isVisible, onClose, onSaved, dob, weight, height }: Props) => {
	const insets = useSafeAreaInsets();
	const { user } = useUser();
	const unitSystem = useUnitSystem();
	const { triggerGoalsUpdate } = useGoalsStore();
	const metric = unitSystem === 'metric';

	const [birthday, setBirthday] = useState(parseDob(dob));
	const [showPicker, setShowPicker] = useState(false);
	const [weightInput, setWeightInput] = useState('');
	const [cmInput, setCmInput] = useState('');
	const [feetInput, setFeetInput] = useState('');
	const [inchesInput, setInchesInput] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const initialWeight = weight
		? String(Math.round(toDisplayWeight(weight, unitSystem) * 10) / 10)
		: '';

	useEffect(() => {
		if (!isVisible) return;
		setBirthday(parseDob(dob));
		setShowPicker(false);
		setError('');
		setWeightInput(initialWeight);
		if (height) {
			const { feet, inches } = cmToFeetInches(height);
			setFeetInput(String(feet));
			setInchesInput(String(inches));
			setCmInput(String(Math.round(Number(height))));
		} else {
			setFeetInput('');
			setInchesInput('');
			setCmInput('');
		}
	}, [isVisible]);

	const heightCm = metric
		? parseFloat(cmInput) || 0
		: feetInchesToCm(parseInt(feetInput) || 0, parseInt(inchesInput) || 0);

	const save = async () => {
		if (!user?.id || saving) return;
		const weightValue = parseFloat(weightInput);
		const age = ageFrom(birthday);

		if (age < 13 || age > 110) return setError('Check your birthday.');
		if (!weightValue || weightValue <= 0) return setError('Enter your weight.');
		if (heightCm < 90 || heightCm > 250) return setError('Check your height.');

		setSaving(true);
		setError('');
		try {
			const res = await fetchAPI('/api/user', {
				method: 'PUT',
				body: JSON.stringify({
					clerkId: user.id,
					dob: toDateString(birthday),
					age,
					height: Math.round(heightCm * 10) / 10,
				}),
			});
			if (!res?.success) throw new Error(res?.error || 'Could not save');

			// Only log a weigh-in when the number actually changed
			if (weightInput !== initialWeight) {
				await fetchAPI('/api/weight', {
					method: 'POST',
					body: JSON.stringify({
						clerkId: user.id,
						weight: Math.round(toStoredWeight(weightValue, unitSystem) * 10) / 10,
						date: getTodayDate(),
					}),
				});
			}

			triggerUserProfileRefresh();
			triggerGoalsUpdate();
			onSaved();
			onClose();
		} catch (err) {
			console.error('Save body info error:', err);
			setError("Couldn't save. Try again.");
		} finally {
			setSaving(false);
		}
	};

	const label = (text: string) => (
		<Text className="text-[11px] font-JakartaSemiBold text-[#574F47] mb-2" style={EYEBROW_STYLE}>
			{text}
		</Text>
	);

	return (
		<ReactNativeModal
			isVisible={isVisible}
			onBackdropPress={onClose}
			onBackButtonPress={onClose}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			className="m-0 justify-end"
		>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
					<View className="flex-row justify-between items-center mb-5">
						<Text className="text-xl font-JakartaExtraBold text-[#262135]">About you</Text>
						<TouchableOpacity onPress={onClose} hitSlop={10}>
							<Ionicons name="close" size={24} color="#334155" />
						</TouchableOpacity>
					</View>

					{/* Birthday */}
					{label('Birthday')}
					<TouchableOpacity
						onPress={() => setShowPicker(s => !s)}
						className="flex-row items-center justify-between bg-[#F9F9F8] border-[1px] border-[#F0EBE6] rounded-2xl px-4 py-3"
					>
						<Text className="font-JakartaBold text-[16px] text-[#262135]">
							{formatDob(birthday)}
						</Text>
						<Text className="font-JakartaMedium text-[13px] text-[#574F47]">
							{ageFrom(birthday)} years
						</Text>
					</TouchableOpacity>
					{showPicker && (
						<DateTimePicker
							value={birthday}
							mode="date"
							display={Platform.OS === 'ios' ? 'spinner' : 'default'}
							maximumDate={new Date()}
							textColor="#262135"
							onChange={(_, picked) => {
								if (Platform.OS !== 'ios') setShowPicker(false);
								if (picked) setBirthday(picked);
							}}
						/>
					)}

					{/* Weight */}
					<View className="mt-5">
						{label('Weight')}
						<NumberBox
							value={weightInput}
							onChangeText={setWeightInput}
							unit={weightUnit(unitSystem)}
							placeholder="0"
						/>
						<Text
							className="font-JakartaMedium text-[12px] text-[#574F47] ml-1"
							style={{ marginTop: 6, lineHeight: 16 }}
						>
							A new weight is saved as today's weigh-in.
						</Text>
					</View>

					{/* Height */}
					<View className="mt-5">
						{label('Height')}
						{metric ? (
							<NumberBox value={cmInput} onChangeText={setCmInput} unit="cm" placeholder="0" />
						) : (
							<View className="flex-row" style={{ columnGap: 10 }}>
								<NumberBox
									value={feetInput}
									onChangeText={setFeetInput}
									unit="ft"
									grow
									placeholder="5"
								/>
								<NumberBox
									value={inchesInput}
									onChangeText={setInchesInput}
									unit="in"
									grow
									placeholder="8"
								/>
							</View>
						)}
					</View>

					{error ? (
						<Text className="font-JakartaSemiBold text-[13px] text-[#E08585] mt-4 text-center">
							{error}
						</Text>
					) : null}

					<View className="flex-row mt-6" style={{ columnGap: 10 }}>
						<TouchableOpacity onPress={onClose} className="flex-1 bg-[#F1F1F1] rounded-xl py-3">
							<Text className="text-center font-JakartaBold text-[15px] text-[#262135]">
								Cancel
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={save}
							disabled={saving}
							className="flex-1 bg-[#262135] rounded-xl py-3 items-center justify-center"
						>
							{saving ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<Text className="text-center font-JakartaBold text-[15px] text-white">Save</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</ReactNativeModal>
	);
};

export default BodyInfoModal;
