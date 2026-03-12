/**
 * Star rating component for interactive feedback submission.
 *
 * Provides an interactive star rating interface that converts between
 * 5-star display (UI) and 0-100 score (backend). Supports hover effects,
 * half-star ratings, and readonly display mode.
 *
 * Features:
 * - Interactive star selection
 * - Half-star support
 * - Hover effects
 * - Readonly mode
 * - Size variants (sm, md, lg)
 * - Score conversion (0-100 <-> 0-5 stars)
 * - Label display
 *
 * @param props - StarRating component props
 * @returns Star rating element
 *
 * @example
 * ```tsx
 * <StarRating
 *   value={70}
 *   onChange={(score) => setScore(score)}
 *   size="md"
 * />
 * ```
 */
'use client';

import { cn } from '@babylon/shared';
import { useState } from 'react';
import { StarRatingBase, scoreToStars, starsToScore } from './StarRatingBase';

interface StarRatingProps {
  value?: number; // 0-100 score
  onChange?: (score: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabel?: boolean;
  className?: string;
}

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

export function StarRating({
  value = 0,
  onChange,
  size = 'md',
  readonly = false,
  showLabel = true,
  className = '',
}: StarRatingProps) {
  const currentStars = scoreToStars(value);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);

  const displayStars =
    hoveredStars !== null && !readonly ? hoveredStars : currentStars;

  const handleClick = (star: number) => {
    if (readonly || !onChange) return;
    onChange(starsToScore(star));
  };

  const handleMouseEnter = (star: number) => {
    if (readonly) return;
    setHoveredStars(star);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoveredStars(null);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StarRatingBase
        stars={displayStars}
        starClassName={cn(sizeClasses[size], 'transition-colors')}
        interactive={!readonly}
        onStarClick={handleClick}
        onStarHover={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        buttonClassName={cn(
          !readonly && 'cursor-pointer hover:scale-110',
          readonly && 'cursor-default'
        )}
        strokeWidth={2}
      />

      {/* Label */}
      {showLabel && (
        <span
          className={cn(
            'font-medium text-muted-foreground',
            textSizeClasses[size]
          )}
        >
          {displayStars > 0 ? (
            <>
              {displayStars.toFixed(1)}/5
              <span className="ml-1 text-xs">({value}/100)</span>
            </>
          ) : (
            'No rating'
          )}
        </span>
      )}
    </div>
  );
}

/**
 * StarRatingCompact Component
 *
 * Read-only compact star display without label
 */
interface StarRatingCompactProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const compactSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StarRatingCompact({
  score,
  size = 'sm',
  className = '',
}: StarRatingCompactProps) {
  const stars = scoreToStars(score);

  return (
    <StarRatingBase
      stars={stars}
      starClassName={compactSizeClasses[size]}
      className={cn('inline-flex', className)}
      gap="gap-0.5"
    />
  );
}

/**
 * StarRatingInput Component
 *
 * Star rating with text description labels
 */

/**
 * Default rating descriptions for the 1-5 star scale.
 * Can be overridden via the `descriptions` prop.
 */
export const DEFAULT_RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Nice to have',
  2: 'Would be helpful',
  3: 'Important',
  4: 'Very important',
  5: 'Must have',
};

interface StarRatingInputProps {
  value?: number;
  onChange?: (score: number) => void;
  showDescriptions?: boolean;
  /** Custom labels for each star rating (1-5). Defaults to DEFAULT_RATING_DESCRIPTIONS. */
  descriptions?: Record<number, string>;
  className?: string;
}

export function StarRatingInput({
  value = 0,
  onChange,
  showDescriptions = true,
  descriptions = DEFAULT_RATING_DESCRIPTIONS,
  className = '',
}: StarRatingInputProps) {
  const currentStars = scoreToStars(value);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);

  // Show description for hovered stars, or current stars if not hovering
  const displayStars = hoveredStars !== null ? hoveredStars : currentStars;
  const description =
    displayStars > 0 ? descriptions[Math.ceil(displayStars)] : '';

  const handleClick = (star: number) => {
    if (onChange) {
      onChange(starsToScore(star));
    }
  };

  const handleMouseEnter = (star: number) => {
    setHoveredStars(star);
  };

  const handleMouseLeave = () => {
    setHoveredStars(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="inline-block">
        <StarRatingBase
          stars={displayStars}
          starClassName="h-8 w-8 transition-colors"
          interactive
          onStarClick={handleClick}
          onStarHover={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          buttonClassName="cursor-pointer hover:scale-110"
          strokeWidth={2}
        />
      </div>
      {showDescriptions && description && (
        <div className="font-medium text-foreground text-sm">{description}</div>
      )}
    </div>
  );
}
