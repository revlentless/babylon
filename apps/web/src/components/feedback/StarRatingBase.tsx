/**
 * Base star rendering component that eliminates duplication across
 * StarRating, StarRatingCompact, StarRatingInput, and FeedbackHistory.
 *
 * Handles the core logic of rendering 5 stars with filled, half-filled,
 * and empty states. Supports both interactive (button) and readonly (span)
 * rendering modes.
 *
 * @example
 * ```tsx
 * <StarRatingBase stars={3.5} starClassName="h-4 w-4" />
 * <StarRatingBase stars={4} starClassName="h-6 w-6" interactive onStarClick={handleClick} onStarHover={handleHover} />
 * ```
 */
'use client';

import { cn } from '@babylon/shared';
import { Star } from 'lucide-react';

/**
 * Convert 0-100 score to 0-5 star rating.
 *
 * Rounds to nearest 0.5 for half-star display.
 *
 * @param score - Score from 0-100
 * @returns Star rating from 0-5 (rounded to 0.5)
 */
export function scoreToStars(score: number): number {
  return Math.round((score / 100) * 5 * 2) / 2; // Round to nearest 0.5
}

/**
 * Convert 0-5 star rating to 0-100 score.
 *
 * @param stars - Star rating from 0-5
 * @returns Score from 0-100
 */
export function starsToScore(stars: number): number {
  return Math.round((stars / 5) * 100);
}

interface StarRatingBaseProps {
  /** Number of stars to display (0-5, supports half values) */
  stars: number;
  /** CSS class applied to each Star icon */
  starClassName?: string;
  /** Additional class for the container */
  className?: string;
  /** Gap between stars (tailwind gap class) */
  gap?: string;
  /** Whether stars are interactive buttons */
  interactive?: boolean;
  /** Callback when a star is clicked (1-indexed) */
  onStarClick?: (star: number) => void;
  /** Callback when mouse enters a star (1-indexed) */
  onStarHover?: (star: number) => void;
  /** Callback when mouse leaves the star container */
  onMouseLeave?: () => void;
  /** Additional class for interactive star buttons */
  buttonClassName?: string;
  /** Stroke width for the Star icon */
  strokeWidth?: number;
}

export function StarRatingBase({
  stars,
  starClassName = 'h-4 w-4',
  className,
  gap = 'gap-1',
  interactive = false,
  onStarClick,
  onStarHover,
  onMouseLeave,
  buttonClassName,
  strokeWidth,
}: StarRatingBaseProps) {
  return (
    <div
      className={cn('flex items-center', gap, className)}
      onMouseLeave={onMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= Math.floor(stars);
        const isHalfFilled = !isFilled && star - 0.5 === stars;

        const starIcon = (
          <Star
            className={cn(
              starClassName,
              isFilled
                ? 'text-yellow-500'
                : isHalfFilled
                  ? 'text-yellow-500/50'
                  : 'text-gray-600',
              interactive && 'transition-colors'
            )}
            fill={isFilled || isHalfFilled ? 'currentColor' : 'none'}
            strokeWidth={strokeWidth}
          />
        );

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onStarClick?.(star)}
              onMouseEnter={() => onStarHover?.(star)}
              className={cn('relative transition-transform', buttonClassName)}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              {starIcon}
            </button>
          );
        }

        return <span key={star}>{starIcon}</span>;
      })}
    </div>
  );
}
