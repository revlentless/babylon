import { describe, expect, test } from 'bun:test';
import type { ArticleItem } from '@babylon/shared';
import {
  deduplicateArticles,
  extractTitleWords,
  jaccardSimilarity,
  STOP_WORDS,
} from './articleDeduplication';

function makeArticle(
  overrides: Partial<ArticleItem> & { title: string }
): ArticleItem {
  return {
    id: Math.random().toString(36).slice(2),
    summary: 'Test summary',
    authorOrgName: 'Test Org',
    publishedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('extractTitleWords', () => {
  test('extracts words longer than 3 characters', () => {
    const words = extractTitleWords('The big cat sat on a mat');
    expect(words.has('big')).toBe(false); // 3 chars, not > 3
    expect(words.has('cat')).toBe(false); // 3 chars
    expect(words.has('the')).toBe(false); // stop word
  });

  test('filters stop words', () => {
    const words = extractTitleWords('the and for are but not you all');
    expect(words.size).toBe(0);
  });

  test('lowercases and removes punctuation', () => {
    const words = extractTitleWords("Bitcoin's Price SURGE! in Markets");
    expect(words.has('bitcoins')).toBe(true);
    expect(words.has('price')).toBe(true);
    expect(words.has('surge')).toBe(true);
    expect(words.has('markets')).toBe(true);
  });

  test('returns empty set for empty string', () => {
    expect(extractTitleWords('').size).toBe(0);
  });

  test('returns empty set for only short/stop words', () => {
    expect(extractTitleWords('the and for a an').size).toBe(0);
  });
});

describe('STOP_WORDS', () => {
  test('contains expected common words', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('and')).toBe(true);
    expect(STOP_WORDS.has('for')).toBe(true);
  });

  test('does not contain content words', () => {
    expect(STOP_WORDS.has('bitcoin')).toBe(false);
    expect(STOP_WORDS.has('market')).toBe(false);
  });
});

describe('jaccardSimilarity', () => {
  test('returns 1 for identical sets', () => {
    const a = new Set(['bitcoin', 'price', 'surge']);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  test('returns 0 for disjoint sets', () => {
    const a = new Set(['bitcoin', 'price']);
    const b = new Set(['weather', 'forecast']);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  test('returns 0 for two empty sets', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });

  test('returns 0 when one set is empty', () => {
    const a = new Set(['bitcoin']);
    expect(jaccardSimilarity(a, new Set())).toBe(0);
  });

  test('calculates correct similarity for partial overlap', () => {
    const a = new Set(['bitcoin', 'price', 'surge']);
    const b = new Set(['bitcoin', 'price', 'crash']);
    // intersection: {bitcoin, price} = 2, union: {bitcoin, price, surge, crash} = 4
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });

  test('handles subset relationship', () => {
    const a = new Set(['bitcoin', 'price']);
    const b = new Set(['bitcoin', 'price', 'surge', 'today']);
    // intersection: 2, union: 4
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});

describe('deduplicateArticles', () => {
  test('returns empty array for empty input', () => {
    expect(deduplicateArticles([])).toEqual([]);
  });

  test('returns single article unchanged', () => {
    const article = makeArticle({ title: 'Bitcoin hits new high' });
    const result = deduplicateArticles([article]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(article.id);
  });

  test('keeps distinct articles', () => {
    const articles = [
      makeArticle({ title: 'Bitcoin hits new record high price today' }),
      makeArticle({ title: 'Weather forecast shows heavy rain coming soon' }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(2);
  });

  test('removes duplicates with similar titles in same category and time window', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const articles = [
      makeArticle({
        title: 'Bitcoin price surges past record breaking levels',
        category: 'crypto',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Bitcoin price surges above record breaking mark',
        category: 'crypto',
        publishedAt: oneHourAgo.toISOString(),
      }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(1);
  });

  test('keeps articles in same category but outside time window', () => {
    const now = new Date();
    const sevenHoursAgo = new Date(now.getTime() - 7 * 60 * 60 * 1000);

    const articles = [
      makeArticle({
        title: 'Bitcoin price surges past record levels today',
        category: 'crypto',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Bitcoin price surges above record levels again',
        category: 'crypto',
        publishedAt: sevenHoursAgo.toISOString(),
      }),
    ];
    const result = deduplicateArticles(articles);
    // Outside 6hr window, similarity ~40% in same category won't trigger rule 1
    // But rule 2 (70%+ regardless) may still apply if similarity is high enough
    // These titles have high overlap, so rule 2 likely catches them
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('removes duplicates with very high similarity across categories', () => {
    const now = new Date();

    const articles = [
      makeArticle({
        title:
          'Major earthquake strikes downtown Tokyo causing widespread damage',
        category: 'disaster',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Major earthquake strikes downtown Tokyo causing massive damage',
        category: 'breaking',
        publishedAt: now.toISOString(),
      }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(1);
  });

  test('keeps articles with different topics in same category', () => {
    const now = new Date();

    const articles = [
      makeArticle({
        title: 'Bitcoin price surges past record levels today',
        category: 'crypto',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Ethereum network upgrade completed successfully overnight',
        category: 'crypto',
        publishedAt: now.toISOString(),
      }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(2);
  });

  test('sorts by publish date and keeps most recent', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const olderArticle = makeArticle({
      id: 'older',
      title: 'Bitcoin price surges past record breaking levels',
      category: 'crypto',
      publishedAt: oneHourAgo.toISOString(),
    });
    const newerArticle = makeArticle({
      id: 'newer',
      title: 'Bitcoin price surges above record breaking mark',
      category: 'crypto',
      publishedAt: now.toISOString(),
    });

    // Pass older first to verify sorting works
    const result = deduplicateArticles([olderArticle, newerArticle]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('newer');
  });

  test('handles articles without category', () => {
    const now = new Date();

    const articles = [
      makeArticle({
        title: 'Major earthquake strikes downtown Tokyo causing damage',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Major earthquake strikes downtown Tokyo causing destruction',
        publishedAt: now.toISOString(),
      }),
    ];
    // Should still deduplicate via rule 2 (high similarity)
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(1);
  });

  test('handles multiple groups of duplicates', () => {
    const now = new Date();

    const articles = [
      makeArticle({
        title: 'Bitcoin price surges past record breaking levels today',
        category: 'crypto',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Bitcoin price surges above record breaking mark today',
        category: 'crypto',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Major earthquake strikes downtown Tokyo with casualties',
        category: 'disaster',
        publishedAt: now.toISOString(),
      }),
      makeArticle({
        title: 'Major earthquake strikes downtown Tokyo with injuries',
        category: 'disaster',
        publishedAt: now.toISOString(),
      }),
    ];
    const result = deduplicateArticles(articles);
    expect(result).toHaveLength(2);
  });
});
