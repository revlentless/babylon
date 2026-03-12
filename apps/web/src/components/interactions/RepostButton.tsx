'use client';

import type { FeedPost, RepostButtonProps } from '@babylon/shared';
import { cn } from '@babylon/shared';
import { Repeat2, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useFeedStore } from '@/stores/feedStore';
import { useInteractionStore } from '@/stores/interactionStore';

/**
 * Repost/share button component for sharing posts.
 *
 * Displays a share/repost button with count. Supports both simple reposts
 * and quote posts (with comment). Shows confirmation modal for new shares.
 * Manages state via Zustand store with optimistic updates. Adds quote posts
 * optimistically to the feed.
 *
 * Features:
 * - Share count display
 * - Quote post support (with comment)
 * - Confirmation modal
 * - Optimistic UI updates
 * - Real-time count updates
 *
 * @param props - RepostButton component props
 * @returns Repost button element
 *
 * @example
 * ```tsx
 * <RepostButton
 *   postId="post-123"
 *   shareCount={5}
 *   initialShared={false}
 * />
 * ```
 */
const sizeClasses = {
  sm: 'text-xs gap-1',
  md: 'h-10 px-3 text-sm gap-1.5',
  lg: 'h-12 px-4 text-base gap-2',
};

const iconSizes = {
  sm: 20,
  md: 22,
  lg: 24,
};

const skeletonSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
};

interface RepostModalHeaderProps {
  quoteComment: string;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  variant: 'mobile' | 'desktop';
}

function RepostModalHeader({
  quoteComment,
  isLoading,
  onClose,
  onSubmit,
  variant,
}: RepostModalHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-border border-b px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={20} />
        </button>
        <h2 className="font-semibold text-foreground text-lg">
          {quoteComment.trim() ? 'Quote' : 'Repost'}
        </h2>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isLoading}
        aria-label={quoteComment.trim() ? 'Post quote' : 'Post repost'}
        className={cn(
          'rounded-full font-semibold text-sm',
          'bg-green-600 text-primary-foreground',
          'transition-colors hover:bg-green-700',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'mobile'
            ? 'px-4 py-1.5'
            : 'flex items-center gap-2 px-5 py-2'
        )}
      >
        {isLoading ? (
          <span
            role="status"
            aria-live="polite"
            className={
              variant === 'desktop' ? 'flex items-center gap-2' : undefined
            }
          >
            {variant === 'desktop' && (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            )}
            Posting...
          </span>
        ) : (
          'Post'
        )}
      </button>
    </div>
  );
}

interface RepostModalContentProps {
  quoteComment: string;
  onQuoteChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  postData: RepostButtonProps['postData'];
  formatTime: (timestamp: string) => string;
  variant: 'mobile' | 'desktop';
}

function RepostModalContent({
  quoteComment,
  onQuoteChange,
  postData,
  formatTime,
  variant,
}: RepostModalContentProps) {
  const isMobile = variant === 'mobile';
  const charCountId = `char-count-${variant}`;

  return (
    <>
      {/* Quote Comment Textarea */}
      <textarea
        value={quoteComment}
        onChange={onQuoteChange}
        placeholder="Add your thoughts (optional)"
        maxLength={500}
        rows={isMobile ? 3 : 4}
        aria-label="Quote comment"
        aria-describedby={charCountId}
        className={cn(
          'mb-1 w-full border-0 bg-transparent',
          'text-foreground placeholder:text-muted-foreground',
          'resize-none transition-colors focus:outline-none',
          isMobile
            ? 'overflow-hidden rounded-xl py-3 pr-3'
            : 'rounded-xl py-4 pr-4 text-base'
        )}
        autoFocus
      />

      {/* Character Count */}
      <div className={cn('flex justify-end', isMobile ? 'mb-3' : 'mb-4')}>
        <span
          id={charCountId}
          className={cn(
            isMobile ? 'text-xs' : 'text-sm',
            quoteComment.length === 0
              ? 'invisible'
              : quoteComment.length > 450
                ? 'text-red-400'
                : 'text-muted-foreground'
          )}
        >
          {quoteComment.length || 0}/500
        </span>
      </div>

      {/* Original Post Preview */}
      {postData && (
        <div
          className={cn(
            'mt-4 rounded-xl border border-border',
            'bg-muted/30',
            isMobile ? 'p-4' : 'p-5'
          )}
        >
          {/* Original Post Author */}
          <div className="mb-3 flex items-start gap-3">
            <Avatar
              id={postData.authorId}
              name={postData.authorName}
              type="user"
              src={postData.authorProfileImageUrl || undefined}
              size={isMobile ? 'sm' : 'md'}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'truncate font-semibold text-foreground',
                    isMobile && 'text-sm'
                  )}
                >
                  {postData.authorName}
                </span>
                <span
                  className={cn(
                    'text-muted-foreground',
                    isMobile ? 'text-xs' : 'text-sm'
                  )}
                >
                  {formatTime(postData.timestamp)}
                </span>
              </div>
              <span
                className={cn(
                  'text-muted-foreground',
                  isMobile ? 'text-xs' : 'text-sm'
                )}
              >
                @{postData.authorUsername || postData.authorId}
              </span>
            </div>
          </div>

          {/* Original Post Content */}
          <p
            className={cn(
              'whitespace-pre-wrap break-words text-foreground leading-relaxed',
              isMobile && 'text-sm'
            )}
          >
            {postData.content}
          </p>
        </div>
      )}
    </>
  );
}

export function RepostButton({
  postId,
  shareCount,
  initialShared = false,
  size = 'md',
  showCount = true,
  className,
  onShareChange,
  postData,
}: RepostButtonProps) {
  // Ensure size is properly typed for index access
  const sizeKey: 'sm' | 'md' | 'lg' = size;
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [quoteComment, setQuoteComment] = useState('');

  const { toggleShare, postInteractions, loadingStates } =
    useInteractionStore();
  const { addOptimisticPost } = useFeedStore();

  // Get state from store instead of local state
  const storeData = postInteractions.get(postId);
  const isShared = storeData?.isShared ?? initialShared;
  const count = storeData?.shareCount ?? shareCount;
  const isLoading = loadingStates.get(`share-${postId}`) ?? false;

  const { authenticated, login } = useAuth();

  const handleCloseModal = () => {
    setShowConfirmation(false);
    setQuoteComment('');
  };

  const handleMobileQuoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuoteComment(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleDesktopQuoteChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuoteComment(e.target.value);
  };

  const handleClick = () => {
    if (!authenticated) {
      login();
      return;
    }
    if (isShared) {
      // If already shared, unshare immediately
      handleShare();
    } else {
      // Show modal for new share
      setShowConfirmation(true);
      setQuoteComment('');
    }
  };

  const handleShare = async () => {
    const willBeShared = !isShared;
    const commentToSend = quoteComment.trim() || undefined;
    const isQuote = !!commentToSend;

    // Close confirmation modal
    setShowConfirmation(false);

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    const response = await toggleShare(postId, commentToSend);
    onShareChange?.(willBeShared);

    // If this is a quote post and we got repost data back, add it optimistically to the feed
    if (response && response.repostPost && isQuote) {
      const repostData = response.repostPost;
      const optimisticPost: FeedPost = {
        id: repostData.id,
        content: repostData.content,
        author: repostData.authorId,
        authorId: repostData.authorId,
        authorName: repostData.authorName,
        authorUsername: repostData.authorUsername || undefined,
        authorProfileImageUrl: repostData.authorProfileImageUrl || undefined,
        timestamp: repostData.timestamp,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        isLiked: false,
        isShared: false,
        // Repost metadata
        isRepost: repostData.isRepost || false,
        originalPostId: repostData.originalPostId || null,
        originalAuthorId: repostData.originalAuthorId || null,
        originalAuthorName: repostData.originalAuthorName || null,
        originalAuthorUsername: repostData.originalAuthorUsername || null,
        originalAuthorProfileImageUrl:
          repostData.originalAuthorProfileImageUrl || null,
        originalContent: repostData.originalContent || null,
        quoteComment: repostData.quoteComment || null,
      };

      // Add to feed optimistically
      addOptimisticPost(optimisticPost);
    }

    // Reset state
    setQuoteComment('');
  };

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Share Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isShared ? 'Unrepost' : 'Repost'}
        aria-pressed={isShared}
        className={cn(
          'flex items-center transition-all duration-200',
          'bg-transparent hover:opacity-70',
          isShared ? 'text-green-600' : 'text-muted-foreground',
          sizeClasses[sizeKey],
          isAnimating && 'scale-110',
          isLoading && 'cursor-wait opacity-50',
          className
        )}
      >
        {isLoading ? (
          <Skeleton className={cn('rounded', skeletonSizes[sizeKey])} />
        ) : (
          <Repeat2
            size={iconSizes[sizeKey]}
            className={cn(
              'transition-all duration-200',
              isAnimating && 'rotate-180'
            )}
          />
        )}
        {showCount && count > 0 && (
          <span className="font-medium tabular-nums">{count}</span>
        )}
      </button>

      {/* Repost Modal - X/Farcaster Style */}
      {showConfirmation && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal - Mobile (Full Screen) */}
          <div className="fixed inset-0 z-[110] flex flex-col bg-sidebar md:hidden">
            <RepostModalHeader
              quoteComment={quoteComment}
              isLoading={isLoading}
              onClose={handleCloseModal}
              onSubmit={handleShare}
              variant="mobile"
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              <RepostModalContent
                quoteComment={quoteComment}
                onQuoteChange={handleMobileQuoteChange}
                postData={postData}
                formatTime={formatTime}
                variant="mobile"
              />
            </div>
          </div>

          {/* Modal - Desktop */}
          <div className="fixed inset-0 z-[110] hidden items-center justify-center p-4 md:flex">
            <div className="flex max-h-[85vh] w-full max-w-[580px] flex-col overflow-hidden rounded-2xl border border-border bg-sidebar shadow-2xl">
              <RepostModalHeader
                quoteComment={quoteComment}
                isLoading={isLoading}
                onClose={handleCloseModal}
                onSubmit={handleShare}
                variant="desktop"
              />
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <RepostModalContent
                  quoteComment={quoteComment}
                  onQuoteChange={handleDesktopQuoteChange}
                  postData={postData}
                  formatTime={formatTime}
                  variant="desktop"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
