/**
 * Centralized reputation trust level thresholds and metadata.
 *
 * Single source of truth for trust level definitions used by
 * ReputationBadge, TrustLevelBadge, and related components.
 */
import { Award, Shield, ShieldCheck } from 'lucide-react';

/**
 * Trust level identifier.
 */
export type TrustLevel = 'newcomer' | 'trusted' | 'veteran' | 'elite';

/**
 * Trust level configuration with thresholds and styling.
 */
export interface TrustLevelConfig {
  level: TrustLevel;
  label: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  glowColor: string;
  Icon: typeof Shield | typeof ShieldCheck | typeof Award;
}

/**
 * Ordered list of trust levels with their thresholds and styling.
 *
 * Thresholds:
 * - Newcomer: 0 - 999 points
 * - Trusted: 1,000 - 4,999 points
 * - Veteran: 5,000 - 9,999 points
 * - Elite: 10,000+ points
 */
export const TRUST_LEVELS: TrustLevelConfig[] = [
  {
    level: 'newcomer',
    label: 'Newcomer',
    min: 0,
    max: 999,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    glowColor: 'shadow-gray-400/50',
    Icon: Shield,
  },
  {
    level: 'trusted',
    label: 'Trusted',
    min: 1000,
    max: 4999,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    glowColor: 'shadow-blue-500/50',
    Icon: ShieldCheck,
  },
  {
    level: 'veteran',
    label: 'Veteran',
    min: 5000,
    max: 9999,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    glowColor: 'shadow-purple-500/50',
    Icon: ShieldCheck,
  },
  {
    level: 'elite',
    label: 'Elite',
    min: 10000,
    max: Number.POSITIVE_INFINITY,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    glowColor: 'shadow-yellow-500/50',
    Icon: Award,
  },
];

/**
 * Get the trust level config for a given reputation point value.
 */
export function getTrustLevelConfig(points: number): TrustLevelConfig {
  const level = TRUST_LEVELS.find((l) => points >= l.min && points <= l.max);
  const defaultLevel = TRUST_LEVELS[0];
  if (!defaultLevel) {
    throw new Error('TRUST_LEVELS array is empty');
  }
  return level ?? defaultLevel;
}

/**
 * Get the next trust level config, or null if at max level.
 */
export function getNextTrustLevel(
  currentLevel: TrustLevelConfig
): TrustLevelConfig | null {
  const currentIndex = TRUST_LEVELS.indexOf(currentLevel);
  if (currentIndex < TRUST_LEVELS.length - 1 && currentIndex >= 0) {
    const nextLevel = TRUST_LEVELS[currentIndex + 1];
    return nextLevel ?? null;
  }
  return null;
}

/**
 * Calculate progress percentage within the current trust level.
 */
export function calculateTrustProgress(
  points: number,
  currentLevel: TrustLevelConfig
): number {
  if (currentLevel.max === Number.POSITIVE_INFINITY) return 100;

  const levelRange = currentLevel.max - currentLevel.min + 1;
  const pointsInLevel = points - currentLevel.min;
  return Math.min(100, Math.round((pointsInLevel / levelRange) * 100));
}
