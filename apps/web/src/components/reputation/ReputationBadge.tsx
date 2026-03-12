/**
 * Reputation badge component for displaying user reputation trust levels.
 *
 * Displays a badge indicating the user's trust level based on reputation points:
 * - Newcomer: < 1000 points (Gray)
 * - Trusted: 1000-4999 points (Blue)
 * - Veteran: 5000-9999 points (Purple)
 * - Elite: 10000+ points (Gold)
 *
 * Features:
 * - Trust level display
 * - Size variants (sm, md, lg)
 * - Optional label text
 * - Color-coded by level
 * - Icon display
 * - Elite level animation
 *
 * @param props - ReputationBadge component props
 * @returns Reputation badge element
 *
 * @example
 * ```tsx
 * <ReputationBadge
 *   reputationPoints={5000}
 *   size="md"
 *   showLabel={true}
 * />
 * ```
 */

import { getTrustLevelConfig } from './reputation-constants';

interface ReputationBadgeProps {
  reputationPoints: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ReputationBadge({
  reputationPoints,
  size = 'md',
  showLabel = true,
  className = '',
}: ReputationBadgeProps) {
  const currentLevel = getTrustLevelConfig(reputationPoints);

  const {
    Icon: BadgeIcon,
    color: badgeColor,
    glowColor,
    label: badgeLabel,
  } = currentLevel;

  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        <BadgeIcon
          className={`${sizeClasses[size]} ${badgeColor} drop-shadow-lg ${glowColor}`}
          fill="currentColor"
          strokeWidth={1.5}
        />
        {currentLevel.level === 'elite' && (
          <div className="absolute inset-0 animate-pulse">
            <BadgeIcon
              className={`${sizeClasses[size]} ${badgeColor} opacity-50`}
              fill="currentColor"
            />
          </div>
        )}
      </div>
      {showLabel && (
        <span
          className={`font-semibold ${badgeColor} ${textSizeClasses[size]}`}
        >
          {badgeLabel}
        </span>
      )}
    </div>
  );
}

/**
 * ReputationScore Component
 *
 * Displays the reputation points with visual styling
 */
interface ReputationScoreProps {
  reputationPoints: number;
  size?: 'sm' | 'md' | 'lg';
  showChange?: boolean;
  change?: number;
  className?: string;
}

export function ReputationScore({
  reputationPoints,
  size = 'md',
  showChange = false,
  change = 0,
  className = '',
}: ReputationScoreProps) {
  const currentLevel = getTrustLevelConfig(reputationPoints);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-bold ${currentLevel.color} ${sizeClasses[size]}`}>
        {reputationPoints.toLocaleString()}
      </span>
      {showChange && change !== 0 && (
        <span
          className={`font-medium text-xs ${
            change > 0 ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {change > 0 ? '+' : ''}
          {change}
        </span>
      )}
    </div>
  );
}
