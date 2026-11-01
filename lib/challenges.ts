import { addDays, weekday } from '@/lib/progress';

// Macro challenges — shapes from fortia-api src/lib/challenges.ts.
// A day succeeds when calories, carbs and fat are all at or under target; protein at
// 90%+ also counts toward the box shade (4 targets in all).

export interface ChallengeTargets {
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
}

export interface Challenge {
	id: number;
	start_date: string;
	end_date: string;
	diet_type: string;
	workouts_per_week: number;
	targets: ChallengeTargets;
	status: 'active' | 'completed' | 'ended';
	ended_at: string | null;
}

export type DayState = 'future' | 'today' | 'success' | 'missed';

export interface ChallengeDay {
	date: string;
	state: DayState;
	logged: boolean;
	level: 0 | 1 | 2 | 3 | 4;
	calories: number;
	protein: number;
	carbs: number;
	fats: number;
	hits: { calories: boolean; carbs: boolean; fats: boolean; protein: boolean };
	workout: boolean;
}

export interface ChallengeWeek {
	index: number;
	from: string;
	to: string;
	workouts: number;
	goal: number;
	met: boolean;
	state: 'future' | 'current' | 'done';
}

export interface ChallengeStats {
	totalDays: number;
	dayNumber: number;
	completedDays: number;
	finishedDays: number;
	missedDays: number;
	completionPct: number | null;
	streak: number;
	weeksMet: number;
	weeksDone: number;
}

export interface ChallengeDetail {
	challenge: Challenge;
	today: string;
	days: ChallengeDay[];
	weeks: ChallengeWeek[];
	stats: ChallengeStats;
}

export interface ChallengesData {
	active: ChallengeDetail | null;
	past: { challenge: Challenge; stats: ChallengeStats }[];
}

export const MAX_CHALLENGE_DAYS = 120;

export const DURATION_PRESETS: { key: string; label: string; days: number }[] = [
	{ key: '4w', label: '4 weeks', days: 28 },
	{ key: '30', label: '30 days', days: 30 },
	{ key: '60', label: '60 days', days: 60 },
	{ key: '100', label: '100 days', days: 100 },
];

// GitHub-style greens: darker = more of the four targets hit
export const LEVEL_COLORS = ['#E8E2DB', '#9BE9A8', '#40C463', '#30A14E', '#216E39'] as const;

export const endDateFor = (start: string, days: number) => addDays(start, days - 1);

// Grid columns = weeks (Sunday → Saturday), padded so the first column starts on Sunday
export const gridColumns = (days: ChallengeDay[]) => {
	if (!days.length) return [];
	const lead = weekday(days[0].date);
	const cells: (ChallengeDay | null)[] = [...Array(lead).fill(null), ...days];
	while (cells.length % 7) cells.push(null);
	return Array.from({ length: cells.length / 7 }, (_, c) => cells.slice(c * 7, c * 7 + 7));
};

export const STATE_LABEL: Record<DayState, string> = {
	future: 'Coming up',
	today: 'Today · in progress',
	success: 'Completed',
	missed: 'Missed',
};
