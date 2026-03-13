/**
 * Reply Rate Limiter Service
 *
 * Enforces exactly 1 reply per hour per NPC for each player.
 */

import { and, db, desc, eq, userInteractions } from '@babylon/db';
import { generateSnowflakeId } from '@babylon/shared';

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
  minutesUntilNextReply?: number;
  lastReplyAt?: Date;
  replyStreak?: number;
  expectedNextReply?: Date;
}

export class ReplyRateLimiter {
  private static readonly MIN_REPLY_INTERVAL_MS = 55 * 60 * 1000; // 55 minutes
  private static readonly MAX_REPLY_INTERVAL_MS = 65 * 60 * 1000; // 65 minutes
  private static readonly IDEAL_REPLY_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

  static getExpectedNextReplyTime(lastReplyTime: Date): Date {
    return new Date(
      lastReplyTime.getTime() + ReplyRateLimiter.IDEAL_REPLY_INTERVAL_MS
    );
  }

  /**
   * Check if user can reply to an NPC's post
   */
  static async canReply(
    userId: string,
    npcId: string
  ): Promise<RateLimitResult> {
    // Get last interaction with this NPC
    const [lastInteraction] = await db
      .select()
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.npcId, npcId)
        )
      )
      .orderBy(desc(userInteractions.timestamp))
      .limit(1);

    // First reply to this NPC - always allowed
    if (!lastInteraction) {
      return {
        allowed: true,
        replyStreak: 0,
      };
    }

    const now = new Date();
    const timeSinceLastReply =
      now.getTime() - lastInteraction.timestamp.getTime();

    // Calculate expected next reply time using IDEAL_REPLY_INTERVAL_MS
    const expectedNextReply = ReplyRateLimiter.getExpectedNextReplyTime(
      lastInteraction.timestamp
    );

    // Too soon - need to wait
    if (timeSinceLastReply < ReplyRateLimiter.MIN_REPLY_INTERVAL_MS) {
      const nextAllowedAt = new Date(
        lastInteraction.timestamp.getTime() +
          ReplyRateLimiter.MIN_REPLY_INTERVAL_MS
      );
      const minutesUntilNextReply = Math.ceil(
        (nextAllowedAt.getTime() - now.getTime()) / (60 * 1000)
      );

      const minutesUntilExpected = Math.ceil(
        (expectedNextReply.getTime() - now.getTime()) / (60 * 1000)
      );

      return {
        allowed: false,
        reason: `You must wait at least 55 minutes between replies to the same NPC. Expected next reply time: ${minutesUntilExpected} minutes. Please wait ${minutesUntilNextReply} more minutes.`,
        nextAllowedAt,
        minutesUntilNextReply,
        lastReplyAt: lastInteraction.timestamp,
        expectedNextReply,
      };
    }

    // Calculate streak (consecutive hourly replies)
    const streak = await ReplyRateLimiter.fetchCurrentStreak(userId, npcId);

    // Too late - warn but allow (breaks consistency for following chance)
    if (timeSinceLastReply > ReplyRateLimiter.MAX_REPLY_INTERVAL_MS) {
      return {
        allowed: true,
        reason: `It's been ${Math.floor(timeSinceLastReply / (60 * 60 * 1000))} hours since your last reply. For best chance of being followed, reply every hour.`,
        lastReplyAt: lastInteraction.timestamp,
        replyStreak: 0, // Streak broken
      };
    }

    // Just right - within 55-65 minute window
    return {
      allowed: true,
      lastReplyAt: lastInteraction.timestamp,
      replyStreak: streak + 1, // Continue streak
    };
  }

  /**
   * Calculate both current and longest consecutive hourly reply streaks
   * in a single pass over interactions sorted by timestamp descending.
   *
   * "current" counts consecutive valid gaps from the most recent interaction
   * (i.e. how many hourly replies in a row, 0 if fewer than 2 interactions).
   * "longest" counts the maximum run of consecutive valid gaps across all
   * interactions plus one (i.e. the number of interactions in the best streak).
   */
  static calculateStreaks(interactions: Array<{ timestamp: Date }>): {
    current: number;
    longest: number;
  } {
    if (interactions.length < 2) {
      return { current: 0, longest: interactions.length };
    }

    let runLength = 0;
    let leadingRun: number | null = null;
    let maxRun = 0;

    for (let i = 0; i < interactions.length - 1; i++) {
      const curr = interactions[i];
      const next = interactions[i + 1];
      if (!curr || !next) continue;
      const gap = curr.timestamp.getTime() - next.timestamp.getTime();

      if (
        gap >= ReplyRateLimiter.MIN_REPLY_INTERVAL_MS &&
        gap <= ReplyRateLimiter.MAX_REPLY_INTERVAL_MS
      ) {
        runLength++;
        if (runLength > maxRun) {
          maxRun = runLength;
        }
      } else {
        if (leadingRun === null) {
          leadingRun = runLength;
        }
        runLength = 0;
      }
    }

    if (leadingRun === null) {
      leadingRun = runLength;
    }

    // current = gap count from the front; longest = element count (gaps + 1)
    return { current: leadingRun, longest: maxRun + 1 };
  }

  /**
   * Fetch recent interactions and calculate the current reply streak
   */
  private static async fetchCurrentStreak(
    userId: string,
    npcId: string
  ): Promise<number> {
    const interactions = await db
      .select({
        timestamp: userInteractions.timestamp,
      })
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.npcId, npcId)
        )
      )
      .orderBy(desc(userInteractions.timestamp))
      .limit(24);

    return ReplyRateLimiter.calculateStreaks(interactions).current;
  }

  /**
   * Record a reply interaction
   */
  static async recordReply(
    userId: string,
    npcId: string,
    postId: string,
    commentId: string,
    qualityScore: number
  ): Promise<void> {
    await db.insert(userInteractions).values({
      id: await generateSnowflakeId(),
      userId,
      npcId,
      postId,
      commentId,
      qualityScore,
      timestamp: new Date(),
    });
  }

  /**
   * Get user's reply statistics for an NPC
   */
  static async getReplyStats(userId: string, npcId: string) {
    const interactions = await db
      .select()
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.npcId, npcId)
        )
      )
      .orderBy(desc(userInteractions.timestamp));

    if (interactions.length === 0) {
      return {
        totalReplies: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageQuality: 0,
        lastReplyAt: null,
      };
    }

    const streaks = ReplyRateLimiter.calculateStreaks(interactions);
    const averageQuality =
      interactions.reduce((sum, i) => sum + i.qualityScore, 0) /
      interactions.length;

    return {
      totalReplies: interactions.length,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      averageQuality,
      lastReplyAt: interactions[0]?.timestamp,
    };
  }

  /**
   * Get all NPCs user has replied to with their stats
   */
  static async getAllReplyStats(userId: string) {
    const interactions = await db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .orderBy(desc(userInteractions.timestamp));

    // Group by NPC
    const npcMap = new Map<string, typeof interactions>();
    for (const interaction of interactions) {
      if (!npcMap.has(interaction.npcId)) {
        npcMap.set(interaction.npcId, []);
      }
      npcMap.get(interaction.npcId)!.push(interaction);
    }

    // Calculate stats for each NPC
    const stats = await Promise.all(
      Array.from(npcMap.keys()).map(async (npcId) => {
        const npcStats = await ReplyRateLimiter.getReplyStats(userId, npcId);
        return {
          npcId,
          ...npcStats,
        };
      })
    );

    return stats;
  }
}
