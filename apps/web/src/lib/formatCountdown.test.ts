import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from 'bun:test';
import { formatCountdown } from './formatCountdown';

describe('formatCountdown', () => {
  const NOW = new Date('2026-03-12T12:00:00Z');

  beforeEach(() => {
    setSystemTime(NOW);
  });

  afterEach(() => {
    setSystemTime();
  });

  it('returns "Resetting..." when the reset time is in the past', () => {
    expect(formatCountdown('2026-03-12T11:00:00Z')).toBe('Resetting...');
  });

  it('returns "Resetting..." when the reset time is exactly now', () => {
    expect(formatCountdown('2026-03-12T12:00:00Z')).toBe('Resetting...');
  });

  it('returns hours remaining when less than 24 hours away', () => {
    // 5 hours from now
    expect(formatCountdown('2026-03-12T17:00:00Z')).toBe('5h remaining');
  });

  it('returns 0h remaining when less than 1 hour away', () => {
    // 30 minutes from now
    expect(formatCountdown('2026-03-12T12:30:00Z')).toBe('0h remaining');
  });

  it('returns days remaining when 24+ hours away', () => {
    // 48 hours from now
    expect(formatCountdown('2026-03-14T12:00:00Z')).toBe('2d remaining');
  });

  it('returns 1d remaining for exactly 24 hours', () => {
    expect(formatCountdown('2026-03-13T12:00:00Z')).toBe('1d remaining');
  });

  it('returns days (floored) when not an exact multiple of 24', () => {
    // 25 hours from now -> 1d
    expect(formatCountdown('2026-03-13T13:00:00Z')).toBe('1d remaining');
  });

  it('returns 23h remaining for 23 hours', () => {
    expect(formatCountdown('2026-03-13T11:00:00Z')).toBe('23h remaining');
  });
});
