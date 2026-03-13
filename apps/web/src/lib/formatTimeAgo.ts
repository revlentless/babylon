import { formatDistanceToNow } from 'date-fns';

/**
 * Format a timestamp as a human-readable relative time string.
 *
 * Returns compact labels for recent times (e.g. "just now", "5m ago", "3h ago",
 * "2d ago", "1w ago") and falls back to `date-fns` `formatDistanceToNow` for
 * older timestamps (>4 weeks).
 *
 * @param timestamp - Date string, Date object, or numeric timestamp
 * @param options.addSuffix - Whether to append " ago" to short labels (default: true)
 * @returns Formatted relative time string, or empty string on invalid input
 *
 * @example
 * ```ts
 * formatTimeAgo('2026-03-12T10:00:00Z'); // "5m ago"
 * formatTimeAgo(new Date(Date.now() - 3600000)); // "1h ago"
 * formatTimeAgo('2026-01-01T00:00:00Z'); // "about 2 months ago"
 * ```
 */
export function formatTimeAgo(
  timestamp: string | Date | number,
  options?: { addSuffix?: boolean }
): string {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    const diffWeeks = Math.floor(diffDays / 7);

    const suffix = options?.addSuffix === false ? '' : ' ago';

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m${suffix}`;
    if (diffHours < 24) return `${diffHours}h${suffix}`;
    if (diffDays < 7) return `${diffDays}d${suffix}`;
    if (diffWeeks < 4) return `${diffWeeks}w${suffix}`;

    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}
