import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAPI } from '@/lib/fetch';

// Activity catalogue from GET /api/activity-types (fortia-api migration 017).
export interface ActivityType {
	slug: string;
	name: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
	category: 'cardio' | 'strength' | 'mind_body' | 'sports';
	met_light: number;
	met_moderate: number;
	met_vigorous: number;
	intensity_labels: string[];
	intensity_hints: string[];
	supports_distance: boolean;
	// mph at [light, moderate, vigorous]; null for activities without distance
	typical_speeds: number[] | null;
	// true: distance + time → speed → MET. false (hiking): intensity sets MET.
	met_from_speed: boolean;
	distance_unit_us: DistanceUnit | null;
	distance_unit_metric: DistanceUnit | null;
	pace_style: 'pace' | 'speed' | 'per100' | 'per500' | null;
}

export type DistanceUnit = 'mi' | 'km' | 'yd' | 'm';

export type Intensity = 'light' | 'moderate' | 'vigorous';
export const INTENSITIES: Intensity[] = ['light', 'moderate', 'vigorous'];

export const FALLBACK_ICON: keyof typeof MaterialCommunityIcons.glyphMap = 'heart-pulse';

// Same for every user and rarely changes: load once per app session.
let cache: ActivityType[] | null = null;
let pending: Promise<ActivityType[]> | null = null;

const loadActivityTypes = () => {
	if (cache) return Promise.resolve(cache);
	if (!pending) {
		pending = fetchAPI('/api/activity-types', { method: 'GET' })
			.then(response => {
				cache = response.success ? response.data : [];
				return cache as ActivityType[];
			})
			.catch(err => {
				console.error('Failed to load activity types:', err);
				return [] as ActivityType[];
			})
			.finally(() => {
				pending = null;
			});
	}
	return pending;
};

export const useActivityTypes = () => {
	const [types, setTypes] = useState<ActivityType[]>(cache || []);
	useEffect(() => {
		if (!cache) loadActivityTypes().then(setTypes);
	}, []);
	return types;
};

export const metFor = (type: ActivityType, intensity: Intensity) =>
	intensity === 'light'
		? type.met_light
		: intensity === 'vigorous'
			? type.met_vigorous
			: type.met_moderate;

// kcal = (MET − 1) × kg × hours — net of resting burn, since calories out already
// counts BMR (same rule as the workout builder).
export const activityCalories = (
	type: ActivityType,
	intensity: Intensity,
	minutes: number,
	weightLbs: number
) =>
	Math.max(0, Math.round((metFor(type, intensity) - 1) * (weightLbs / 2.20462) * (minutes / 60)));

// --- Distance logging ------------------------------------------------------------

const MILES_PER_UNIT: Record<DistanceUnit, number> = {
	mi: 1,
	km: 0.621371,
	yd: 1 / 1760,
	m: 0.000621371,
};

export const distanceUnitFor = (type: ActivityType, system: 'us' | 'metric'): DistanceUnit =>
	(system === 'metric' ? type.distance_unit_metric : type.distance_unit_us) ||
	(system === 'metric' ? 'km' : 'mi');

// Stepper increment for the distance input in that unit
export const distanceStep = (unit: DistanceUnit) => (unit === 'm' || unit === 'yd' ? 100 : 0.25);

export const toMiles = (value: number, unit: DistanceUnit) => value * MILES_PER_UNIT[unit];

// MET for a measured speed: linear between the activity's (speed, MET) points for
// light / moderate / vigorous, extended past the ends along the nearest segment.
export const metForSpeed = (type: ActivityType, mph: number) => {
	const speeds = type.typical_speeds || [];
	const mets = [type.met_light, type.met_moderate, type.met_vigorous];
	if (speeds.length !== 3) return type.met_moderate;
	const seg = mph <= speeds[1] ? 0 : 1;
	const [s0, s1] = [speeds[seg], speeds[seg + 1]];
	const [m0, m1] = [mets[seg], mets[seg + 1]];
	const met = s1 === s0 ? m0 : m0 + ((mph - s0) * (m1 - m0)) / (s1 - s0);
	return Math.min(type.met_vigorous * 1.3, Math.max(1.5, met));
};

// Intensity whose typical speed is closest — used to label a measured pace.
export const intensityForSpeed = (type: ActivityType, mph: number): Intensity => {
	const speeds = type.typical_speeds || [];
	if (speeds.length !== 3) return 'moderate';
	let best = 0;
	speeds.forEach((s, i) => {
		if (Math.abs(s - mph) < Math.abs(speeds[best] - mph)) best = i;
	});
	return INTENSITIES[best];
};

// Speed shown the way people track that sport: min/mi for runs and walks, mph for
// rides, per 100 yd/m for swims, per 500 m split for rowing.
export const formatPace = (type: ActivityType, mph: number, system: 'us' | 'metric') => {
	if (!(mph > 0)) return '';
	const clock = (minutes: number) => {
		const total = Math.round(minutes * 60);
		return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
	};
	const minutesPer = (unit: DistanceUnit, amount = 1) => (toMiles(amount, unit) / mph) * 60;
	switch (type.pace_style) {
		case 'speed':
			return system === 'metric'
				? `${(mph / MILES_PER_UNIT.km).toFixed(1)} km/h`
				: `${mph.toFixed(1)} mph`;
		case 'per100': {
			const unit = system === 'metric' ? 'm' : 'yd';
			return `${clock(minutesPer(unit, 100))} /100 ${unit}`;
		}
		case 'per500':
			return `${clock(minutesPer('m', 500))} /500 m`;
		default: {
			const unit = system === 'metric' ? 'km' : 'mi';
			return `${clock(minutesPer(unit))} /${unit}`;
		}
	}
};

export interface DistanceEstimate {
	calories: number;
	minutes: number; // given, or estimated from the intensity's typical speed
	mph: number;
	intensity: Intensity;
	estimatedTime: boolean;
}

// Calories from a distance, with or without the time it took.
// - With time: speed → MET (or the chosen intensity for hiking).
// - Without: time = distance ÷ the chosen intensity's typical speed.
export const distanceCalories = (
	type: ActivityType,
	distanceMiles: number,
	minutes: number | null,
	chosen: Intensity,
	weightLbs: number
): DistanceEstimate | null => {
	const speeds = type.typical_speeds;
	if (!(distanceMiles > 0) || !speeds || speeds.length !== 3) return null;
	const kg = weightLbs / 2.20462;

	if (minutes && minutes > 0) {
		const mph = distanceMiles / (minutes / 60);
		const met = type.met_from_speed ? metForSpeed(type, mph) : metFor(type, chosen);
		const intensity = type.met_from_speed ? intensityForSpeed(type, mph) : chosen;
		return {
			calories: Math.max(0, Math.round((met - 1) * kg * (minutes / 60))),
			minutes,
			mph,
			intensity,
			estimatedTime: false,
		};
	}

	const mph = speeds[INTENSITIES.indexOf(chosen)];
	const estimated = (distanceMiles / mph) * 60;
	return {
		calories: Math.max(0, Math.round((metFor(type, chosen) - 1) * kg * (estimated / 60))),
		minutes: Math.max(1, Math.round(estimated)),
		mph,
		intensity: chosen,
		estimatedTime: true,
	};
};

// Logged entries are saved by name ("Running"), so match the name back to an icon.
export const iconForActivityName = (
	name: string,
	types: ActivityType[]
): keyof typeof MaterialCommunityIcons.glyphMap => {
	const lower = name.toLowerCase();
	return types.find(t => lower.startsWith(t.name.toLowerCase()))?.icon || FALLBACK_ICON;
};
