import { useUser } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import ReactNativeModal from 'react-native-modal';

import CustomButton from '@/components/CustomButton';
import WeightRuler from '@/components/WeightRuler';
import { getTodayDate } from '@/lib/dateUtils';
import { fetchAPI } from '@/lib/fetch';
import { toDisplayWeight, toStoredWeight, useUnitSystem, weightUnit } from '@/lib/units';
import { triggerUserProfileRefresh, useUserProfile } from '@/lib/userUtils';

// "Log your weight" with the slide ruler, starting on the current weight. Shared by the
// Body card (WeightTracking) and the global + log menu (QuickLogButton), so weight can
// be logged from any tab. The save bumps the data version, so open screens refetch.
const LogWeightModal = ({
	isVisible,
	onClose,
	onLogged,
	date,
	startWeightLb,
}: {
	isVisible: boolean;
	onClose: () => void;
	onLogged?: () => void;
	date?: string; // defaults to today
	startWeightLb?: number | null; // latest weigh-in; falls back to the profile weight
}) => {
	const { user } = useUser();
	const unitSystem = useUnitSystem();
	const profile = useUserProfile();
	const [pending, setPending] = useState<number | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!isVisible) {
			setPending(null);
			return;
		}
		const currentLb = Number(startWeightLb) || Number(profile.weight) || 150;
		setPending(Math.round(toDisplayWeight(currentLb, unitSystem) * 10) / 10);
	}, [isVisible]);

	const save = async () => {
		if (pending === null || isNaN(pending) || !user?.id) return;
		setSaving(true);
		try {
			await fetchAPI('/api/weight', {
				method: 'POST',
				body: JSON.stringify({
					// Entered in the user's unit; stored in lbs
					weight: Math.round(toStoredWeight(pending, unitSystem) * 10) / 10,
					date: date || getTodayDate(),
					clerkId: user.id,
				}),
			});
			triggerUserProfileRefresh();
			onLogged?.();
			onClose();
		} catch (error) {
			console.error('Weight logging error:', error);
		} finally {
			setSaving(false);
		}
	};

	return (
		<ReactNativeModal isVisible={isVisible} onBackdropPress={onClose}>
			<View className="bg-white py-14 px-4 mx-0 rounded-md">
				<View className="pb-4">
					<Text className="text-xl text-center font-JakartaSemiBold">Log your weight</Text>
				</View>

				<View className="flex mx-auto my-8 w-full justify-center">
					{pending !== null && (
						<WeightRuler
							value={pending}
							min={unitSystem === 'metric' ? 25 : 50}
							max={unitSystem === 'metric' ? 230 : 500}
							unit={weightUnit(unitSystem)}
							onChange={setPending}
						/>
					)}
				</View>

				<CustomButton onPress={save} title={saving ? 'Saving…' : 'Save'} disabled={saving} />
			</View>
		</ReactNativeModal>
	);
};

export default LogWeightModal;
