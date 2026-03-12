import { describe, expect, test } from 'bun:test';
import { formatTimeAgo } from './formatTimeAgo';

describe('formatTimeAgo', () => {
  const now = Date.now();

  test('returns "just now" for timestamps less than 1 minute ago', () => {
    expect(formatTimeAgo(new Date(now - 30_000))).toBe('just now');
    expect(formatTimeAgo(new Date(now - 500))).toBe('just now');
  });

  test('returns minutes for timestamps less than 1 hour ago', () => {
    expect(formatTimeAgo(new Date(now - 5 * 60_000))).toBe('5m ago');
    expect(formatTimeAgo(new Date(now - 45 * 60_000))).toBe('45m ago');
  });

  test('returns hours for timestamps less than 1 day ago', () => {
    expect(formatTimeAgo(new Date(now - 2 * 3_600_000))).toBe('2h ago');
    expect(formatTimeAgo(new Date(now - 23 * 3_600_000))).toBe('23h ago');
  });

  test('returns days for timestamps less than 1 week ago', () => {
    expect(formatTimeAgo(new Date(now - 3 * 86_400_000))).toBe('3d ago');
    expect(formatTimeAgo(new Date(now - 6 * 86_400_000))).toBe('6d ago');
  });

  test('returns weeks for timestamps less than 4 weeks ago', () => {
    expect(formatTimeAgo(new Date(now - 14 * 86_400_000))).toBe('2w ago');
    expect(formatTimeAgo(new Date(now - 21 * 86_400_000))).toBe('3w ago');
  });

  test('falls back to date-fns for timestamps older than 4 weeks', () => {
    const result = formatTimeAgo(new Date(now - 60 * 86_400_000));
    expect(result).toContain('ago');
    expect(result).not.toMatch(/^\d+[mhdw] ago$/);
  });

  test('accepts string timestamps', () => {
    const fiveMinutesAgo = new Date(now - 5 * 60_000).toISOString();
    expect(formatTimeAgo(fiveMinutesAgo)).toBe('5m ago');
  });

  test('accepts Date objects', () => {
    expect(formatTimeAgo(new Date(now - 3_600_000))).toBe('1h ago');
  });

  test('accepts numeric timestamps', () => {
    expect(formatTimeAgo(now - 2 * 60_000)).toBe('2m ago');
  });

  test('returns empty string for invalid input', () => {
    expect(formatTimeAgo('not a date')).toBe('');
    expect(formatTimeAgo('')).toBe('');
  });

  test('respects addSuffix: false option', () => {
    expect(
      formatTimeAgo(new Date(now - 5 * 60_000), { addSuffix: false })
    ).toBe('5m');
    expect(
      formatTimeAgo(new Date(now - 2 * 3_600_000), { addSuffix: false })
    ).toBe('2h');
  });

  test('"just now" is not affected by addSuffix option', () => {
    expect(formatTimeAgo(new Date(now - 500), { addSuffix: false })).toBe(
      'just now'
    );
  });
});
