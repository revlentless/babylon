/**
 * String Utility Functions
 */

/**
 * Escape special regex characters in a string so it can be used
 * safely inside a RegExp constructor.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
