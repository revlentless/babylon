/**
 * Shared size class mappings for interaction buttons (Like, Repost, Delete).
 *
 * These constants are used by multiple interaction button components
 * to ensure consistent sizing across the UI.
 */

export type InteractionButtonSize = 'sm' | 'md' | 'lg';

/**
 * Common container size classes shared by LikeButton, RepostButton, and DeleteButton.
 */
export const interactionSizeClasses: Record<InteractionButtonSize, string> = {
  sm: 'text-xs gap-1',
  md: 'h-10 px-3 text-sm gap-1.5',
  lg: 'h-12 px-4 text-base gap-2',
};

/**
 * Skeleton placeholder sizes shared by LikeButton and RepostButton.
 */
export const interactionSkeletonSizes: Record<InteractionButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};
