/**
 * Shared filter-sort-paginate helpers for JSON adapters.
 */

import type { PaginatedResult, PaginationOptions } from '../../types';

/**
 * Filter, sort, and slice an array — the common query pattern used across
 * all JSON storage adapters.
 */
export function queryArray<T>(
  items: T[],
  filter: (item: T) => boolean,
  options?: {
    sortBy?: (a: T, b: T) => number;
    limit?: number;
    offset?: number;
  }
): T[] {
  let result = items.filter(filter);
  if (options?.sortBy) {
    result.sort(options.sortBy);
  }
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? result.length;
  return result.slice(offset, offset + limit);
}

/**
 * Same as {@link queryArray} but wraps the result in a {@link PaginatedResult}.
 */
export function queryPaginated<T>(
  items: T[],
  filter: (item: T) => boolean,
  options?: PaginationOptions & {
    sortBy?: (a: T, b: T) => number;
    defaultLimit?: number;
    nextCursor?: (last: T) => string;
  }
): PaginatedResult<T> {
  const filtered = items.filter(filter);
  if (options?.sortBy) {
    filtered.sort(options.sortBy);
  }

  const limit = options?.limit ?? options?.defaultLimit ?? 100;
  const offset = options?.offset ?? 0;

  const paged = filtered.slice(offset, offset + limit);
  const hasMore = offset + limit < filtered.length;

  return {
    items: paged,
    total: filtered.length,
    hasMore,
    nextCursor: hasMore && options?.nextCursor && paged.length > 0
      ? options.nextCursor(paged[paged.length - 1]!)
      : undefined,
  };
}
