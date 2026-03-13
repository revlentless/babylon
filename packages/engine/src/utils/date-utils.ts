/**
 * Date Utilities
 * Shared date parsing and extraction utilities for the game engine.
 */

import { logger } from '@babylon/shared';

/**
 * Extract day number from timestamp string.
 * Parses the day-of-month from any ISO 8601 date: "YYYY-MM-DDTHH:MM:SSZ"
 */
export function extractDayFromTimestamp(timestamp: string): number {
  // Match any ISO date: YYYY-MM-DD
  const isoMatch = timestamp.match(/\d{4}-\d{2}-(\d{2})/);
  if (isoMatch) {
    return Number.parseInt(isoMatch[1]!, 10);
  }

  return 0;
}

/**
 * Extract day number from an event object (handles different formats)
 */
export function extractDayFromEvent(event: {
  day?: number;
  timestamp?: Date | string;
}): number {
  if (event.day) return event.day;
  if (event.timestamp) {
    return extractDayFromTimestamp(
      typeof event.timestamp === 'string'
        ? event.timestamp
        : event.timestamp.toISOString()
    );
  }
  return 0;
}

/**
 * Extract day number from a post object
 */
export function extractDayFromPost(post: {
  day?: number;
  createdAt?: Date | string;
}): number {
  if (post.day) return post.day;
  if (post.createdAt) {
    return extractDayFromTimestamp(
      typeof post.createdAt === 'string'
        ? post.createdAt
        : post.createdAt.toISOString()
    );
  }
  return 0;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Compute a game-relative day number (1-indexed) from a game start time.
 * Day 1 = first 24 hours from startedAt
 * Day 2 = hours 24-48, etc.
 *
 * @param startedAt - The continuous game's start timestamp
 * @param timestamp - The content/event timestamp
 * @returns 1-indexed day number since startedAt (Day 1 is first day)
 */
export function getGameDayNumber(startedAt: Date, timestamp: Date): number {
  const daysElapsed = Math.floor(
    (timestamp.getTime() - startedAt.getTime()) / MS_PER_DAY
  );
  // Clamp to minimum of 1 to handle timestamps before startedAt
  const result = Math.max(daysElapsed + 1, 1); // 1-indexed: Day 1 is first day

  // Log diagnostic warning when timestamp is before startedAt (clock drift or test data issue)
  if (timestamp.getTime() < startedAt.getTime()) {
    logger.warn(
      'getGameDayNumber: timestamp is before startedAt, clamping to day 1',
      {
        startedAt: startedAt.toISOString(),
        timestamp: timestamp.toISOString(),
        daysElapsed,
        result,
      },
      'DateUtils'
    );
  }

  return result;
}

/**
 * Validate a dayNumber for storage in Post/WorldEvent int columns.
 * Days are 1-indexed (Day 1 is the first day of the game).
 * Returns undefined for invalid day numbers to prevent DB errors.
 */
export function toSafeDayNumber(dayNumber: number): number | undefined {
  return Number.isFinite(dayNumber) && dayNumber >= 1 && dayNumber <= 2147483647
    ? dayNumber
    : undefined;
}

/**
 * Extract the date portion (YYYY-MM-DD) from a Date object.
 * Avoids the duplicate pattern: `.toISOString().split('T')[0]`
 *
 * @param date - Date object or ISO string
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * const today = toDateString(new Date()); // "2025-01-25"
 * ```
 */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0] ?? '';
}

/**
 * Get today's date as YYYY-MM-DD string.
 * Convenience wrapper for common pattern.
 *
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return toDateString(new Date());
}

/**
 * Default game start date used for day-number-to-date mapping.
 * Matches the original genesis game start (October 1, 2025).
 * Override via GAME_START_DATE env var (ISO 8601 date string).
 */
const DEFAULT_GAME_START = '2025-10-01T00:00:00Z';

function getGameStartDate(): Date {
  const envDate = process.env.GAME_START_DATE;
  if (envDate) {
    const parsed = new Date(envDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    logger.warn(
      'Invalid GAME_START_DATE env var, falling back to default',
      { envDate },
      'DateUtils'
    );
  }
  return new Date(DEFAULT_GAME_START);
}

/**
 * Convert a 1-indexed game day number to an ISO date string prefix.
 * Day 1 maps to the game start date, day 2 to start + 1, etc.
 *
 * @param day - 1-indexed game day number
 * @returns ISO date prefix like "2025-10-01T" (without time portion)
 *
 * @example
 * ```typescript
 * gameDatePrefix(1)  // "2025-10-01T"
 * gameDatePrefix(15) // "2025-10-15T"
 * ```
 */
export function gameDatePrefix(day: number): string {
  const start = getGameStartDate();
  const date = new Date(start.getTime() + (day - 1) * MS_PER_DAY);
  return `${toDateString(date)}T`;
}

/**
 * Convert a 1-indexed game day number to a full ISO timestamp.
 *
 * @param day - 1-indexed game day number
 * @param time - Time portion like "12:00:00Z" (default "12:00:00Z")
 * @returns Full ISO timestamp like "2025-10-01T12:00:00Z"
 */
export function gameDateTimestamp(day: number, time = '12:00:00Z'): string {
  return `${gameDatePrefix(day)}${time}`;
}
