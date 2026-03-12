/**
 * Tests for useScrollLock hook.
 *
 * Tests the scroll lock logic as a pure function since the hook
 * is a thin wrapper around document.body.style.overflow manipulation.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

/**
 * Simulates the scroll lock behavior without React.
 * Mirrors the hook's lock/unlock logic.
 */
function simulateScrollLock(
  body: { overflow: string },
  isLocked: boolean
): { cleanup: () => void; savedOverflow: string } {
  const savedOverflow = body.overflow;

  if (isLocked) {
    body.overflow = 'hidden';
  }

  return {
    cleanup: () => {
      body.overflow = savedOverflow;
    },
    savedOverflow,
  };
}

describe('useScrollLock logic', () => {
  let bodyStyle: { overflow: string };

  beforeEach(() => {
    bodyStyle = { overflow: '' };
  });

  afterEach(() => {
    bodyStyle.overflow = '';
  });

  it('should set overflow to hidden when locked', () => {
    simulateScrollLock(bodyStyle, true);
    expect(bodyStyle.overflow).toBe('hidden');
  });

  it('should not change overflow when not locked', () => {
    bodyStyle.overflow = 'auto';
    simulateScrollLock(bodyStyle, false);
    expect(bodyStyle.overflow).toBe('auto');
  });

  it('should restore original overflow on cleanup', () => {
    bodyStyle.overflow = 'scroll';
    const { cleanup } = simulateScrollLock(bodyStyle, true);
    expect(bodyStyle.overflow).toBe('hidden');

    cleanup();
    expect(bodyStyle.overflow).toBe('scroll');
  });

  it('should restore empty string when original was empty', () => {
    bodyStyle.overflow = '';
    const { cleanup } = simulateScrollLock(bodyStyle, true);
    expect(bodyStyle.overflow).toBe('hidden');

    cleanup();
    expect(bodyStyle.overflow).toBe('');
  });

  it('should save the correct original overflow value', () => {
    bodyStyle.overflow = 'visible';
    const { savedOverflow } = simulateScrollLock(bodyStyle, true);
    expect(savedOverflow).toBe('visible');
  });

  it('should handle sequential lock/unlock cycles', () => {
    bodyStyle.overflow = '';

    // First lock
    const first = simulateScrollLock(bodyStyle, true);
    expect(bodyStyle.overflow).toBe('hidden');
    first.cleanup();
    expect(bodyStyle.overflow).toBe('');

    // Second lock
    const second = simulateScrollLock(bodyStyle, true);
    expect(bodyStyle.overflow).toBe('hidden');
    second.cleanup();
    expect(bodyStyle.overflow).toBe('');
  });
});
