import { type ArticleItem, logger } from '@babylon/shared';

/**
 * Common stop words to exclude from title similarity comparisons.
 * Words that are too generic to be meaningful for deduplication.
 */
export const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'has',
]);

/** Minimum word length to include in similarity comparison */
const MIN_WORD_LENGTH = 3;

/** Time window in milliseconds for same-category deduplication (6 hours) */
const SAME_CATEGORY_TIME_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Jaccard similarity threshold for same-category + time-window deduplication */
const CATEGORY_SIMILARITY_THRESHOLD = 0.4;

/** Jaccard similarity threshold for cross-category deduplication */
const HIGH_SIMILARITY_THRESHOLD = 0.7;

/**
 * Extract significant words from a title for comparison.
 * Removes punctuation, filters stop words, and requires minimum word length.
 */
export function extractTitleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter((w) => w.length > MIN_WORD_LENGTH && !STOP_WORDS.has(w))
  );
}

/**
 * Calculate the Jaccard similarity coefficient between two sets.
 * Returns a value between 0 (no overlap) and 1 (identical sets).
 * Returns 0 if both sets are empty.
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((w) => b.has(w)));
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Deduplicate articles about the same event.
 *
 * Uses two rules:
 * 1. Same category + 40%+ title similarity + published within 6 hours -> duplicate
 * 2. 70%+ title similarity regardless of category -> duplicate
 *
 * Articles are sorted by publish date (most recent first), and earlier articles
 * are kept while later duplicates are discarded.
 */
export function deduplicateArticles(articles: ArticleItem[]): ArticleItem[] {
  if (articles.length <= 1) return articles;

  const uniqueArticles: ArticleItem[] = [];
  const seenArticles: Array<{
    article: ArticleItem;
    titleWords: Set<string>;
    timestamp: number;
  }> = [];

  // Sort by published date (most recent first)
  const sorted = [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  for (const article of sorted) {
    const titleWords = extractTitleWords(article.title);
    const timestamp = new Date(article.publishedAt).getTime();

    let isDuplicate = false;
    for (const seen of seenArticles) {
      // Rule 1: Same category + significant title overlap + published within 6 hours
      const timeDiff = Math.abs(timestamp - seen.timestamp);
      const isSameTimeWindow = timeDiff < SAME_CATEGORY_TIME_WINDOW_MS;

      if (isSameTimeWindow && article.category === seen.article.category) {
        const similarity = jaccardSimilarity(titleWords, seen.titleWords);

        if (similarity >= CATEGORY_SIMILARITY_THRESHOLD) {
          isDuplicate = true;
          logger.debug(
            'Duplicate article detected',
            {
              kept: seen.article.title,
              discarded: article.title,
              similarity,
              timeDiffMinutes: Math.round(timeDiff / 60000),
            },
            'articleDeduplication'
          );
          break;
        }
      }

      // Rule 2: Very high title similarity (70%+) regardless of category = same event
      const similarity = jaccardSimilarity(titleWords, seen.titleWords);

      if (similarity >= HIGH_SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        logger.debug(
          'Duplicate article detected (high similarity)',
          {
            kept: seen.article.title,
            discarded: article.title,
            similarity,
          },
          'articleDeduplication'
        );
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
      seenArticles.push({ article, titleWords, timestamp });
    }
  }

  logger.debug(
    'Deduplicated articles',
    {
      before: articles.length,
      after: uniqueArticles.length,
      removed: articles.length - uniqueArticles.length,
    },
    'articleDeduplication'
  );

  return uniqueArticles;
}
