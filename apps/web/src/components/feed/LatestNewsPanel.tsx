'use client';

import { type ArticleItem, logger } from '@babylon/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/shared/Skeleton';
// ArticleDetailModal removed - articles now use /post/[id] page
import { useWidgetRefresh } from '@/contexts/WidgetRefreshContext';
import { useSSEChannel } from '@/hooks/useSSE';
import { deduplicateArticles } from '@/lib/articleDeduplication';
import { useWidgetCacheStore } from '@/stores/widgetCacheStore';

/**
 * Latest news panel component for displaying recent articles.
 *
 * Displays a list of the latest articles from the feed. Uses widget cache
 * for performance and supports manual refresh via WidgetRefreshContext.
 * Fetches articles from posts API filtered by type=article.
 *
 * Features:
 * - Article list with metadata
 * - Widget caching
 * - Manual refresh support
 * - Loading states
 * - Empty state handling
 *
 * @returns Latest news panel element
 */
export function LatestNewsPanel() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getLatestNews, setLatestNews } = useWidgetCacheStore();
  const { registerRefresh, unregisterRefresh } = useWidgetRefresh();

  // Use ref to store fetchArticles function to break dependency chain
  const fetchArticlesRef = useRef<(() => void) | null>(null);

  const fetchArticles = useCallback(
    async (skipCache = false) => {
      // Check cache first (unless explicitly skipping)
      if (!skipCache) {
        const cached = getLatestNews();
        // Only use cache if it has data (don't cache empty arrays)
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setArticles(cached as ArticleItem[]);
          setLoading(false);
          return;
        }
      }

      // Query posts API with type filter for articles - fetch more for deduplication
      const response = await fetch('/api/posts?type=article&limit=15');

      if (!response.ok) {
        logger.error(
          'Failed to fetch articles:',
          { status: response.status },
          'LatestNewsPanel'
        );
        setArticles([]);
        setLoading(false);
        return;
      }

      const data = await response.json();

      logger.info(
        'Articles API response:',
        {
          hasPosts: !!data.posts,
          count: data.posts?.length || 0,
          firstPost: data.posts?.[0],
        },
        'LatestNewsPanel'
      );

      if (data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        // Transform posts to ArticleItem format
        const articlesData: ArticleItem[] = data.posts
          .filter((post: { type?: string }) => post.type === 'article') // Double-check type
          .map(
            (post: {
              id: string;
              articleTitle?: string | null;
              authorId: string;
              authorName?: string;
              byline?: string | null;
              sentiment?: string | null;
              category?: string | null;
              timestamp: string;
              biasScore?: number | null;
              slant?: string | null;
              content: string;
            }) => ({
              id: post.id,
              title: post.articleTitle || 'Untitled Article',
              summary: post.content,
              authorOrgName: post.authorName || post.authorId,
              byline: post.byline || undefined,
              sentiment: post.sentiment || undefined,
              category: post.category || undefined,
              publishedAt: post.timestamp,
              slant: post.slant || undefined,
              biasScore: post.biasScore !== null ? post.biasScore : undefined,
            })
          );

        // Deduplicate articles about the same event
        const uniqueArticles = deduplicateArticles(articlesData).slice(0, 5);

        logger.info(
          'Articles processed:',
          { count: uniqueArticles.length, articles: uniqueArticles },
          'LatestNewsPanel'
        );
        setArticles(uniqueArticles);
        setLatestNews(uniqueArticles); // Cache the data
      } else {
        logger.warn(
          'No articles in response',
          {
            hasData: !!data,
            hasPosts: !!data.posts,
            isArray: Array.isArray(data.posts),
            length: data.posts?.length,
          },
          'LatestNewsPanel'
        );
        setArticles([]);
      }
      setLoading(false);
    },
    [getLatestNews, setLatestNews]
  );

  // Update ref when fetchArticles changes
  useEffect(() => {
    fetchArticlesRef.current = () => fetchArticles(true); // Skip cache on manual refresh
  }, [fetchArticles]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Register refresh function
  useEffect(() => {
    const refresh = () => fetchArticles(true);
    registerRefresh('latest-news', refresh);
    return () => unregisterRefresh('latest-news');
  }, [registerRefresh, unregisterRefresh, fetchArticles]);

  // Real-time refresh on feed/breaking-news events
  useSSEChannel('feed', () => {
    void fetchArticles(true);
  });
  useSSEChannel('breaking-news', () => {
    void fetchArticles(true);
  });

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) {
      return `${days}d ago`;
    }
    if (hours > 0) {
      return `${hours}h ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return 'Just now';
  };

  const handleArticleClick = (articleId: string) => {
    // Navigate directly to article page (LatestNewsPanel only shows article-type posts)
    router.push(`/article/${articleId}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-3 font-bold text-foreground text-lg">Latest News</h2>
      {loading ? (
        <div className="flex-1 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : articles.length === 0 ? (
        <div className="flex-1 text-muted-foreground text-sm">
          No articles available yet.
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleArticleClick(article.id)}
              className="-mx-2 cursor-pointer rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-muted/50"
            >
              <p className="font-semibold text-foreground text-sm leading-snug">
                {article.title}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {article.authorOrgName} · {getTimeAgo(article.publishedAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
