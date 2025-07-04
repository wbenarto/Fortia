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
