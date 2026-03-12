/**
 * Shared date formatting utilities using date-fns.
 * Centralizes date display logic so components don't reinvent formatting.
 */

import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isSameYear,
  isValid,
} from 'date-fns';

/**
 * Format a date as a relative "time ago" string.
 * - < 1 min: "Just now"
 * - < 60 min: "5m ago"
 * - < 24 hours: "3h ago"
 * - < 7 days: "2d ago"
 * - Same year: "Mar 12"
 * - Different year: "Mar 12, 2024"
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return 'Unknown time';

  const now = new Date();
  const mins = differenceInMinutes(now, d);
  const hours = differenceInHours(now, d);
  const days = differenceInDays(now, d);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return isSameYear(d, now) ? format(d, 'MMM d') : format(d, 'MMM d, yyyy');
}

/**
 * Format a date as a compact "time ago" string (no "ago" suffix).
 * - < 1 min: "just now"
 * - < 60 min: "5m"
 * - < 24 hours: "3h"
 * - < 7 days: "2d"
 * - Older: "Mar 12"
 */
export function formatTimeAgoCompact(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return '';

  const now = new Date();
  const mins = differenceInMinutes(now, d);
  const hours = differenceInHours(now, d);
  const days = differenceInDays(now, d);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return format(d, 'MMM d');
}

/**
 * Format a date as "MMM d" (e.g., "Mar 12").
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d');
}

/**
 * Format a date as "MMM d, yyyy" (e.g., "Mar 12, 2024").
 */
export function formatMediumDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date with time as "MMM d, yyyy h:mm a" (e.g., "Mar 12, 2024 3:45 PM").
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

/**
 * Format a date with time, no year: "MMM d h:mm a" (e.g., "Mar 12 3:45 PM").
 */
export function formatDateTimeShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d h:mm a');
}

/**
 * Format a time only: "h:mm a" (e.g., "3:45 PM").
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'h:mm a');
}

/**
 * Format a date and time for chat: "MMM d at h:mm a" (e.g., "Mar 12 at 3:45 PM").
 */
export function formatChatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${format(d, 'MMM d')} at ${format(d, 'h:mm a')}`;
}

/**
 * Format a date as "MMMM d, yyyy" (e.g., "March 12, 2024").
 */
export function formatLongDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMMM d, yyyy');
}

/**
 * Format a date with long month and time: "MMMM d, yyyy h:mm a" (e.g., "March 12, 2024 3:45 PM").
 */
export function formatLongDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMMM d, yyyy h:mm a');
}

/**
 * Format a date for analytics charts, adapting to period.
 * - 'month' period: "MMM 'yy" (e.g., "Mar '24")
 * - other: "MMM d" (e.g., "Mar 12")
 */
export function formatChartDate(date: Date | string, period?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (period === 'month') return format(d, "MMM ''yy");
  return format(d, 'MMM d');
}
