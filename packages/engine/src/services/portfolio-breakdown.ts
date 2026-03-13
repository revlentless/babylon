/**
 * Server-side portfolio breakdown (wallet + agents + positions) for consistent P/L.
 */

import {
  db,
  markets,
  perpPositions,
  pointsTransactions,
  positions,
  users,
} from '@babylon/db';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  calculatePerpPositionValue,
  calculatePredictionPositionValue,
  toNumber,
} from '../utils/position-valuation';

export interface PortfolioBreakdownSnapshot {
  wallet: number;
  agents: number;
  positions: number;
  available: number;
  originalAmount: number;
  totalAssets: number;
  totalPnL: number;
  agentCount: number;
  totalPoints: number;
}

/**
 * Canonical portfolio breakdown used across Profile, Dashboard, OG, etc.
 *
 * Total P/L formula:
 *   totalPnL = (agents + positions + wallet) - originalAmount
 * where originalAmount includes net peer transfers.
 */
export async function calculatePortfolioBreakdown(
  userId: string
): Promise<PortfolioBreakdownSnapshot | null> {
  // User IDs may come in as either the canonical `users.id` or `users.privyId`.
  // To keep portfolio totals stable across migrations, we treat both as aliases
  // for the same user when present.
  const userResult = await db
    .select({
      id: users.id,
      privyId: users.privyId,
      virtualBalance: users.virtualBalance,
      totalDeposited: users.totalDeposited,
      totalWithdrawn: users.totalWithdrawn,
      reputationPoints: users.reputationPoints,
    })
    .from(users)
    .where(or(eq(users.id, userId), eq(users.privyId, userId)))
    .limit(1);

  const user = userResult[0] as
    | {
        id: string;
        privyId: string | null;
        virtualBalance: unknown;
        totalDeposited: unknown;
        totalWithdrawn: unknown;
        reputationPoints: number;
      }
    | undefined;
  if (!user) return null;

  const canonicalUserId = user.id;
  const positionUserIds = Array.from(
    new Set([canonicalUserId, user.privyId].filter(Boolean))
  ) as string[];

  const agentRows = await db
    .select({
      id: users.id,
      virtualBalance: users.virtualBalance,
    })
    .from(users)
    .where(and(eq(users.managedBy, canonicalUserId), eq(users.isAgent, true)));

  const agentIds = agentRows.map((a) => a.id);
  const agentCount = agentIds.length;

  const wallet = toNumber(user.virtualBalance);
  const agents = agentRows.reduce(
    (sum, agent) => sum + toNumber(agent.virtualBalance),
    0
  );

  const [perpRows, predictionRows] = await Promise.all([
    db
      .select({
        size: perpPositions.size,
        leverage: perpPositions.leverage,
        unrealizedPnL: perpPositions.unrealizedPnL,
      })
      .from(perpPositions)
      .where(
        and(
          inArray(perpPositions.userId, positionUserIds),
          isNull(perpPositions.closedAt)
        )
      ),
    db
      .select({
        shares: positions.shares,
        avgPrice: positions.avgPrice,
        side: positions.side,
        marketYesShares: markets.yesShares,
        marketNoShares: markets.noShares,
      })
      .from(positions)
      .innerJoin(markets, eq(positions.marketId, markets.id))
      .where(
        and(
          inArray(positions.userId, positionUserIds),
          eq(markets.resolved, false)
        )
      ),
  ]);

  const perpsValue = perpRows.reduce(
    (sum, p) => sum + calculatePerpPositionValue(p),
    0
  );

  const predictionsValue = predictionRows.reduce(
    (sum, p) =>
      sum +
      calculatePredictionPositionValue({
        shares: p.shares,
        avgPrice: p.avgPrice,
        side: p.side,
        marketYesShares: p.marketYesShares,
        marketNoShares: p.marketNoShares,
      }),
    0
  );

  const positionsValue = perpsValue + predictionsValue;

  const totalDeposited = toNumber(user.totalDeposited);
  const totalWithdrawn = toNumber(user.totalWithdrawn);

  // Exclude peer-to-peer point transfers from PnL baseline.
  const transferResult = await db
    .select({
      netTransfers: sql<number>`COALESCE(SUM(${pointsTransactions.amount}), 0)`,
    })
    .from(pointsTransactions)
    .where(
      and(
        inArray(pointsTransactions.userId, positionUserIds),
        inArray(pointsTransactions.reason, [
          'transfer_sent',
          'transfer_received',
        ])
      )
    )
    .limit(1);

  const netTransfers = toNumber(transferResult[0]?.netTransfers);
  const originalAmount = totalDeposited - totalWithdrawn + netTransfers;

  const available = wallet + agents;
  const totalAssets = wallet + agents + positionsValue;
  const totalPnL = totalAssets - originalAmount;
  const totalPoints = wallet + positionsValue + user.reputationPoints;

  return {
    wallet,
    agents,
    positions: positionsValue,
    available,
    originalAmount,
    totalAssets,
    totalPnL,
    agentCount,
    totalPoints,
  };
}
