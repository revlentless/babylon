/**
 * Formats a countdown string from a future ISO date to now.
 * Returns a human-readable string like "2d remaining", "5h remaining", or "Resetting...".
 */
export function formatCountdown(resetsAt: string): string {
  const diff = new Date(resetsAt).getTime() - Date.now();
  if (diff <= 0) return 'Resetting...';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d remaining`;
  }
  return `${hours}h remaining`;
}
