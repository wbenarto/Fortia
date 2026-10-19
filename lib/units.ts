import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The DB always stores weight in lb and height in cm. This preference only changes
// how those values are shown and entered, so switching it never touches stored data.
export type UnitSystem = 'us' | 'metric';

interface UnitStore {
	system: UnitSystem;
	setSystem: (system: UnitSystem) => void;
}

export const useUnitStore = create<UnitStore>()(
	persist(
		set => ({
			system: 'us',
			setSystem: system => set({ system }),
		}),
		{ name: 'unit-system', storage: createJSONStorage(() => AsyncStorage) }
	)
);

export const useUnitSystem = () => useUnitStore(s => s.system);

const LB_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

// Postgres numeric columns come back from the API as strings, so coerce everything
const num = (value: number | string) => Number(value) || 0;

export const lbToKg = (lb: number | string) => num(lb) / LB_PER_KG;
export const kgToLb = (kg: number | string) => num(kg) * LB_PER_KG;

export const weightUnit = (system: UnitSystem) => (system === 'metric' ? 'kg' : 'lbs');

// Stored lb → number in the user's unit
export const toDisplayWeight = (lb: number | string, system: UnitSystem) =>
	system === 'metric' ? lbToKg(lb) : num(lb);

// Number the user typed in their unit → lb for the DB
export const toStoredWeight = (value: number | string, system: UnitSystem) =>
	system === 'metric' ? kgToLb(value) : num(value);

export const formatWeight = (lb: number | string, system: UnitSystem, decimals = 1) =>
	`${toDisplayWeight(lb, system).toFixed(decimals)} ${weightUnit(system)}`;

export const cmToFeetInches = (cm: number | string) => {
	const totalInches = Math.round(num(cm) / CM_PER_INCH);
	return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
};

export const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * CM_PER_INCH;

export const formatHeight = (cm: number | string, system: UnitSystem) => {
	if (system === 'metric') return `${Math.round(num(cm))} cm`;
	const { feet, inches } = cmToFeetInches(cm);
	return `${feet}' ${inches}"`;
};
