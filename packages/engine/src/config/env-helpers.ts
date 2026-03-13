/**
 * Shared environment variable parsing helpers for configuration modules.
 *
 * These utilities parse `process.env` values into typed defaults with
 * validation and warning logs.  Both `alpha-group-config.ts` and
 * `npc-activity.ts` (and any future config modules) should import from
 * here instead of defining their own copies.
 *
 * @module engine/config/env-helpers
 */

import { logger } from '@babylon/shared';
import { clamp01 } from '../utils/math-utils';

const LOG_TAG = 'env-helpers';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Parse an environment variable as a number with a default fallback.
 * Returns the default if the env var is not set or not a valid number.
 */
export function envNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse an environment variable as a boolean with a default fallback.
 *
 * Accepts: true/false, 1/0, yes/no (case-insensitive).
 * Logs a warning and returns default for unrecognized values.
 */
export function envBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  logger.warn(
    `${key}="${value}" is not a valid boolean, using default ${defaultValue}`,
    { key, value, defaultValue },
    LOG_TAG
  );
  return defaultValue;
}

// ---------------------------------------------------------------------------
// Bounded numbers
// ---------------------------------------------------------------------------

/**
 * Parse an environment variable as a probability (0.0-1.0) with bounds checking.
 * Clamps the value to valid probability range to prevent configuration errors.
 */
export function envProbability(key: string, defaultValue: number): number {
  const value = envNumber(key, defaultValue);
  if (value < 0 || value > 1) {
    logger.warn(
      `${key}=${value} is outside valid probability range (0-1), clamping to bounds`,
      { key, value },
      LOG_TAG
    );
  }
  return clamp01(value);
}

/**
 * Parse an environment variable as a score (0.0-1.0) with bounds checking.
 * Similar to envProbability but semantically distinct for quality scores, thresholds, etc.
 * Clamps the value to valid [0,1] range to prevent configuration errors.
 */
export function envScore(key: string, defaultValue: number): number {
  const value = envNumber(key, defaultValue);
  if (value < 0 || value > 1) {
    logger.warn(
      `${key}=${value} is outside valid score range (0-1), clamping to bounds`,
      { key, value },
      LOG_TAG
    );
  }
  return clamp01(value);
}

/**
 * Parse an environment variable as a positive integer.
 * Returns the default if the value is <= 0 or not an integer.
 */
export function envPositiveInt(key: string, defaultValue: number): number {
  const value = envNumber(key, defaultValue);
  if (value <= 0 || !Number.isInteger(value)) {
    logger.warn(
      `${key}=${value} must be a positive integer, using default ${defaultValue}`,
      { key, value, defaultValue },
      LOG_TAG
    );
    return defaultValue;
  }
  return value;
}

/**
 * Parse an environment variable as a positive number (> 0) with bounds checking.
 * Returns the default and logs a warning if the value is <= 0.
 */
export function envPositiveNumber(key: string, defaultValue: number): number {
  const value = envNumber(key, defaultValue);
  if (value <= 0) {
    logger.warn(
      `${key}=${value} must be positive (> 0), using default ${defaultValue}`,
      { key, value, defaultValue },
      LOG_TAG
    );
    return defaultValue;
  }
  return value;
}

/**
 * Parse an environment variable as a non-negative number (>= 0) with bounds checking.
 * Returns the default and logs a warning if the value is < 0.
 * Use for values where 0 is valid (e.g., to disable a feature).
 */
export function envNonNegativeNumber(
  key: string,
  defaultValue: number
): number {
  const value = envNumber(key, defaultValue);
  if (value < 0) {
    logger.warn(
      `${key}=${value} must be non-negative (>= 0), using default ${defaultValue}`,
      { key, value, defaultValue },
      LOG_TAG
    );
    return defaultValue;
  }
  return value;
}
