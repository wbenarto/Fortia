/**
 * Date utility functions for consistent timezone handling
 *
 * This module provides utilities for handling dates in the user's local timezone.
 * The approach ensures that:
 * 1. All date operations use the user's local timezone
 * 2. Database queries use proper timezone-aware date ranges
 * 3. Dates are stored in UTC in the database but displayed in local timezone
 * 4. Day boundaries are calculated correctly regardless of timezone
 */

/**
 * Get today's date in the user's local timezone
 * Returns date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
	return new Date().toLocaleDateString('en-CA');
}

/**
 * Get a date in the user's local timezone
 * @param date - Date object or date string
 * @returns date in YYYY-MM-DD format
 */
export function getLocalDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj.toLocaleDateString('en-CA');
}

/**
 * Convert a date string to a Date object in the user's local timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function parseLocalDate(dateString: string): Date {
	const [year, month, day] = dateString.split('-').map(Number);
	return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Get the start and end of a day in the user's local timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Object with start and end timestamps
 */
export function getDayBounds(dateString: string): { start: Date; end: Date } {
	const date = parseLocalDate(dateString);
	const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	end.setMilliseconds(end.getMilliseconds() - 1);

	return { start, end };
}

/**
 * Format a date for display
 * @param date - Date object or date string
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Check if a date is today
 * @param date - Date object or date string
 * @returns boolean
 */
export function isToday(date: Date | string): boolean {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	return dateObj.toDateString() === today.toDateString();
}
