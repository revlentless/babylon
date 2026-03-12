'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatTimeAgo } from '@/lib/format-date';

interface ArticlePreview {
  id: string;
  articleTitle: string | null;
  content: string;
  imageUrl: string | null;
  authorName: string;
  timestamp: string;
}

interface MoreArticlesWidgetProps {
  /** Current article ID to exclude from the list */
  currentArticleId: string;
  /** Maximum number of articles to show */
  limit?: number;
  /** Optional className for styling */
  className?: string;
}

/**
 * Widget displaying additional articles for readers to explore.
 * Fetches recent articles excluding the current one being viewed.
 */
export function MoreArticlesWidget({
  currentArticleId,
  limit = 5,
  className,
}: MoreArticlesWidgetProps) {
  const [articles, setArticles] = useState<ArticlePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);

      const response = await fetch(
        `/api/posts?type=article&limit=${limit + 1}`
      );

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      const posts = result.data || result.posts || [];

      // Filter out the current article and limit results
      const filteredArticles = posts
        .filter((post: ArticlePreview) => post.id !== currentArticleId)
        .slice(0, limit);

      setArticles(filteredArticles);
      setIsLoading(false);
    };

    fetchArticles();
  }, [currentArticleId, limit]);

  if (isLoading) {
    return (
      <div className={className}>
        <h2 className="mb-3 font-bold text-foreground text-lg">
          More Articles
        </h2>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h2 className="mb-3 font-bold text-foreground text-lg">More Articles</h2>

      <div className="space-y-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/article/${article.id}`}
            className="-mx-2 block rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-muted/50"
          >
            <p className="font-semibold text-foreground text-sm leading-snug">
              {article.articleTitle || 'Untitled Article'}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {article.authorName} · {formatTimeAgo(article.timestamp)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
