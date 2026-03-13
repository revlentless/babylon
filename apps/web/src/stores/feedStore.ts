/**
 * Feed Store - Manages feed state and optimistic updates
 * Handles: optimistic post creation, quote posts
 */

import type { FeedPost } from '@babylon/shared';
import { create } from 'zustand';

interface FeedStoreState {
  // Callbacks for feed updates
  onOptimisticPost: ((post: FeedPost) => void) | null;
  onPostDeleted: ((postId: string) => void) | null;
}

interface FeedStoreActions {
  // Register callback for optimistic post updates (used by feed page)
  registerOptimisticPostCallback: (callback: (post: FeedPost) => void) => void;
  unregisterOptimisticPostCallback: () => void;

  // Register callback for post deletion (used by feed page)
  registerPostDeletedCallback: (callback: (postId: string) => void) => void;
  unregisterPostDeletedCallback: () => void;

  // Add optimistic post (called by components like RepostButton)
  addOptimisticPost: (post: FeedPost) => void;

  // Remove post from feed (called by DeleteButton)
  removePost: (postId: string) => void;
}

type FeedStore = FeedStoreState & FeedStoreActions;

export const useFeedStore = create<FeedStore>((set, get) => ({
  // Initial state
  onOptimisticPost: null,
  onPostDeleted: null,

  // Register callback for feed page to receive optimistic posts
  registerOptimisticPostCallback: (callback) => {
    set({ onOptimisticPost: callback });
  },

  unregisterOptimisticPostCallback: () => {
    set({ onOptimisticPost: null });
  },

  // Register callback for feed page to handle post deletion
  registerPostDeletedCallback: (callback) => {
    set({ onPostDeleted: callback });
  },

  unregisterPostDeletedCallback: () => {
    set({ onPostDeleted: null });
  },

  // Add optimistic post - will call the registered callback if available
  addOptimisticPost: (post) => {
    const { onOptimisticPost } = get();
    if (onOptimisticPost) {
      onOptimisticPost(post);
    }
  },

  // Remove post from feed - will call the registered callback if available
  removePost: (postId) => {
    const { onPostDeleted } = get();
    if (onPostDeleted) {
      onPostDeleted(postId);
    }
  },
}));
