/**
 * JSON Post Adapter
 */

import type { PostPort } from '../../../ports/posts';
import type {
  PaginatedResult,
  PaginationOptions,
  PostRecord,
} from '../../../types';
import type { JsonIdGenerator } from '../id-generator';
import { queryPaginated } from '../query-utils';
import type { JsonStorageState } from '../types';

export class JsonPostAdapter implements PostPort {
  constructor(
    private state: JsonStorageState,
    _idGen: JsonIdGenerator,
    private onChange: () => void
  ) {}

  async getPost(id: string): Promise<PostRecord | null> {
    return this.state.posts[id] ?? null;
  }

  async getRecentPosts(
    options?: PaginationOptions
  ): Promise<PaginatedResult<PostRecord>> {
    return queryPaginated(
      Object.values(this.state.posts),
      (p) => !p.deletedAt,
      {
        ...options,
        sortBy: (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
        nextCursor: (last) => last.timestamp.toISOString(),
      }
    );
  }

  async getPostsByAuthor(
    authorId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PostRecord>> {
    return queryPaginated(
      Object.values(this.state.posts),
      (p) => p.authorId === authorId && !p.deletedAt,
      {
        ...options,
        sortBy: (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      }
    );
  }

  async getPostsByType(
    type: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PostRecord>> {
    return queryPaginated(
      Object.values(this.state.posts),
      (p) => p.type === type && !p.deletedAt,
      {
        ...options,
        sortBy: (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      }
    );
  }

  async createPost(
    post: Omit<PostRecord, 'likeCount' | 'commentCount' | 'repostCount'>
  ): Promise<PostRecord> {
    const record: PostRecord = {
      ...post,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
    };
    this.state.posts[post.id] = record;
    this.onChange();
    return record;
  }

  async createManyPosts(
    posts: Omit<PostRecord, 'likeCount' | 'commentCount' | 'repostCount'>[]
  ): Promise<{ count: number }> {
    for (const post of posts) {
      const record: PostRecord = {
        ...post,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
      };
      this.state.posts[post.id] = record;
    }
    this.onChange();
    return { count: posts.length };
  }

  async updatePost(
    id: string,
    updates: Partial<PostRecord>
  ): Promise<PostRecord> {
    const existing = this.state.posts[id];
    if (!existing) {
      throw new Error(`Post not found: ${id}`);
    }

    const updated: PostRecord = {
      ...existing,
      ...updates,
    };
    this.state.posts[id] = updated;
    this.onChange();
    return updated;
  }

  async deletePost(id: string): Promise<void> {
    const post = this.state.posts[id];
    if (post) {
      post.deletedAt = new Date();
      this.onChange();
    }
  }

  async incrementLikeCount(id: string): Promise<void> {
    const post = this.state.posts[id];
    if (post) {
      post.likeCount++;
      this.onChange();
    }
  }

  async decrementLikeCount(id: string): Promise<void> {
    const post = this.state.posts[id];
    if (post && post.likeCount > 0) {
      post.likeCount--;
      this.onChange();
    }
  }

  async incrementCommentCount(id: string): Promise<void> {
    const post = this.state.posts[id];
    if (post) {
      post.commentCount++;
      this.onChange();
    }
  }

  async incrementRepostCount(id: string): Promise<void> {
    const post = this.state.posts[id];
    if (post) {
      post.repostCount++;
      this.onChange();
    }
  }

  async getPostComments(
    postId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<PostRecord>> {
    return queryPaginated(
      Object.values(this.state.posts),
      (p) => p.commentOnPostId === postId && !p.deletedAt,
      {
        ...options,
        defaultLimit: 50,
        sortBy: (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      }
    );
  }

  async getTotalPosts(): Promise<number> {
    return Object.values(this.state.posts).filter((p) => !p.deletedAt).length;
  }
}
