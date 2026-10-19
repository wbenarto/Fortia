import { create } from 'zustand';
import { LocationStore } from '@/types/type';

export const useLocationStore = create<LocationStore>(set => ({
	userAddress: null,
	userLatitude: null,
	userLongitude: null,
	destinationLongitude: null,
	destinationLatitude: null,
	destinationAddress: null,
	setUserLocation: ({
		latitude,
		longitude,
		address,
	}: {
		latitude: number;
		longitude: number;
		address: string;
	}) => {
		set(() => ({
			userLatitude: latitude,
			userLongitude: longitude,
			userAddress: address,
		}));
	},
	setDestinationLocation: ({
		latitude,
		longitude,
		address,
	}: {
		latitude: number;
		longitude: number;
		address: string;
	}) => {
		set(() => ({
			destinationLatitude: latitude,
			destinationLongitude: longitude,
			destinationAddress: address,
		}));
	},
}));

// Store for managing goals updates
interface GoalsStore {
	goalsUpdated: boolean;
	triggerGoalsUpdate: () => void;
	resetGoalsUpdate: () => void;
}

export const useGoalsStore = create<GoalsStore>(set => ({
	goalsUpdated: false,
	triggerGoalsUpdate: () => set({ goalsUpdated: true }),
	resetGoalsUpdate: () => set({ goalsUpdated: false }),
}));

// Store for the quick-log FAB — signals which logging modal a host screen
// should open once it becomes focused.
export type QuickLogType = 'meal' | 'weight' | 'activity';

interface QuickLogStore {
	pending: QuickLogType | null;
	requestLog: (type: QuickLogType) => void;
	consume: () => void;
}

export const useQuickLogStore = create<QuickLogStore>(set => ({
	pending: null,
	requestLog: type => set({ pending: type }),
	consume: () => set({ pending: null }),
}));

// Bumped by fetchAPI after every successful write. Tab screens compare it on focus
// (see useRefetchOnFocus) so swiping between tabs only refetches when data changed.
interface DataVersionStore {
	version: number;
	bump: () => void;
}

export const useDataVersionStore = create<DataVersionStore>(set => ({
	version: 0,
	bump: () => set(state => ({ version: state.version + 1 })),
}));
