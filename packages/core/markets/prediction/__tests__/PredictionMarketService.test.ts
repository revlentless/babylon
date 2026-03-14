import { beforeEach, describe, expect, it } from 'vitest';
import type {
  BroadcastPort,
  CachePort,
  FeeProcessor,
  WalletPort,
} from '../../shared/common';
import { PredictionMarketService } from '../PredictionMarketService';
import { PredictionPricing } from '../pricing';
import type {
  PredictionDbPort,
  PredictionMarketRecord,
  PredictionPositionRecord,
  PredictionPriceSnapshotRecord,
  PredictionSide,
} from '../types';

const feeConfig = {
  tradingFeeRate: 0.001,
  platformShare: 0.5,
  referrerShare: 0.5,
  minFeeAmount: 0.01,
};

class InMemoryWallet implements WalletPort {
  balances = new Map<string, number>();
  pnls: Array<{ userId: string; pnl: number; reason: string }> = [];

  constructor(private defaultBalance = 10_000) {}

  async debit({
    userId,
    amount,
  }: {
    userId: string;
    amount: number;
    reason: string;
  }): Promise<void> {
    const balance = this.balances.get(userId) ?? this.defaultBalance;
    if (balance < amount) throw new Error('Insufficient funds');
    this.balances.set(userId, balance - amount);
  }

  async credit({
    userId,
    amount,
  }: {
    userId: string;
    amount: number;
    reason: string;
  }): Promise<void> {
    const balance = this.balances.get(userId) ?? this.defaultBalance;
    this.balances.set(userId, balance + amount);
  }

  async recordPnL({
    userId,
    pnl,
    reason,
  }: {
    userId: string;
    pnl: number;
    reason: string;
  }): Promise<void> {
    this.pnls.push({ userId, pnl, reason });
  }

  async getBalance(userId: string): Promise<{ balance: number }> {
    return { balance: this.balances.get(userId) ?? this.defaultBalance };
  }
}

class InMemoryDb implements PredictionDbPort {
  markets = new Map<string, PredictionMarketRecord>();
  positions = new Map<string, PredictionPositionRecord>();
  snapshots: PredictionPriceSnapshotRecord[] = [];
  idCounter = 1;

  constructor(initialMarket?: PredictionMarketRecord) {
    if (initialMarket) {
      this.markets.set(initialMarket.id, { ...initialMarket });
    }
  }

  async getMarketById(id: string): Promise<PredictionMarketRecord | null> {
    const m = this.markets.get(id);
    return m ? { ...m } : null;
  }

  async getMarketsByIds(ids: string[]): Promise<PredictionMarketRecord[]> {
    return ids
      .map((id) => this.markets.get(id))
      .filter((m): m is PredictionMarketRecord => !!m)
      .map((m) => ({ ...m }));
  }

  async listMarkets(): Promise<PredictionMarketRecord[]> {
    return Array.from(this.markets.values()).map((m) => ({ ...m }));
  }

  async listUserPositions(userId: string): Promise<PredictionPositionRecord[]> {
    return Array.from(this.positions.values())
      .filter((p) => p.userId === userId)
      .map((p) => ({ ...p }));
  }

  async createMarketFromQuestion(
    _question: unknown,
    _initialLiquidity: number,
    _options?: { description?: string | null }
  ): Promise<PredictionMarketRecord> {
    throw new Error('not used in tests');
  }

  async updateMarketState(
    marketId: string,
    updates: Partial<PredictionMarketRecord>
  ): Promise<PredictionMarketRecord> {
    const m = this.markets.get(marketId);
    if (!m) throw new Error('market not found');
    const updated = { ...m, ...updates };
    this.markets.set(marketId, updated);
    return { ...updated };
  }

  async getPosition(
    userId: string,
    marketId: string,
    side: PredictionSide
  ): Promise<PredictionPositionRecord | null> {
    const pos = Array.from(this.positions.values()).find(
      (p) => p.userId === userId && p.marketId === marketId && p.side === side
    );
    return pos ? { ...pos } : null;
  }

  async upsertPosition(
    position: Omit<PredictionPositionRecord, 'id'> & { id?: string }
  ): Promise<PredictionPositionRecord> {
    const id = position.id ?? `pos-${this.idCounter++}`;
    const record: PredictionPositionRecord = {
      id,
      userId: position.userId,
      marketId: position.marketId,
      side: position.side,
      shares: position.shares,
      avgPrice: position.avgPrice,
      status: position.status ?? 'active',
      outcome: position.outcome ?? null,
      pnl: position.pnl,
      resolvedAt: position.resolvedAt ?? null,
      createdAt: position.createdAt ?? new Date(),
      updatedAt: position.updatedAt ?? new Date(),
    };
    this.positions.set(id, record);
    return { ...record };
  }

  async deletePosition(positionId: string): Promise<void> {
    this.positions.delete(positionId);
  }

  async listPositionsForMarket(
    marketId: string
  ): Promise<PredictionPositionRecord[]> {
    return Array.from(this.positions.values())
      .filter((p) => p.marketId === marketId)
      .map((p) => ({ ...p }));
  }

  async insertPriceSnapshot(
    snapshot: PredictionPriceSnapshotRecord
  ): Promise<void> {
    this.snapshots.push({ ...snapshot });
  }
}

class InMemoryBroadcast implements BroadcastPort {
  events: Array<{ channel: string; payload: Record<string, unknown> }> = [];
  async emit(channel: string, payload: Record<string, unknown>): Promise<void> {
    this.events.push({ channel, payload });
  }
}

class InMemoryCache implements CachePort {
  keys: string[] = [];
  async invalidate(pattern: string): Promise<void> {
    this.keys.push(pattern);
  }
}

describe('PredictionMarketService', () => {
  const market: PredictionMarketRecord = {
    id: 'm1',
    question: 'Will it rain?',
    yesShares: 5000,
    noShares: 5000,
    liquidity: 10_000,
    endDate: new Date(Date.now() + 3600_000),
    resolved: false,
  };

  let db: InMemoryDb;
  let wallet: InMemoryWallet;
  let broadcast: InMemoryBroadcast;
  let cache: InMemoryCache;
  let feeProcessor: FeeProcessor;
  let service: PredictionMarketService;

  beforeEach(() => {
    db = new InMemoryDb(market);
    wallet = new InMemoryWallet();
    broadcast = new InMemoryBroadcast();
    cache = new InMemoryCache();
    feeProcessor = {
      processTradingFee: async () => ({ feeCharged: 0, referrerPaid: 0 }),
    };
    service = new PredictionMarketService({
      db,
      wallet,
      broadcast,
      cache,
      clock: { now: () => new Date() },
      fees: feeConfig,
      feeProcessor,
    });
  });

  it('buy should increase shares, position, liquidity and emit snapshot/event', async () => {
    const result = await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });

    expect(result.shares).toBeGreaterThan(0);
    expect(result.market.liquidity).toBeGreaterThan(market.liquidity);
    const pos = await db.getPosition('u1', 'm1', 'yes');
    expect(pos?.shares).toBeCloseTo(result.shares);
    expect(db.snapshots.length).toBe(1);
    expect(broadcast.events.length).toBe(1);
    expect(cache.keys).toContain('prediction:m1:*');
  });

  it('buy should allow overriding trade attribution', async () => {
    service = new PredictionMarketService({
      db,
      wallet,
      broadcast,
      cache,
      clock: { now: () => new Date() },
      fees: feeConfig,
      feeProcessor,
      tradeSource: 'npc_trade',
      tradeActorType: 'npc',
    });

    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });

    expect(db.snapshots[0]?.source).toBe('npc_trade');

    const event = broadcast.events[0]?.payload as unknown as {
      type?: string;
      trade?: { actorType?: string; source?: string };
    };
    expect(event.type).toBe('prediction_trade');
    expect(event.trade?.actorType).toBe('npc');
    expect(event.trade?.source).toBe('npc_trade');
  });

  it('sell should decrease position, compute pnl, and close when remaining small', async () => {
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });
    const pos = await db.getPosition('u1', 'm1', 'yes');
    expect(pos).not.toBeNull();
    const sellShares = pos!.shares * 0.9;
    const result = await service.sell({
      userId: 'u1',
      marketId: 'm1',
      shares: sellShares,
    });
    expect(result.netProceeds).toBeGreaterThan(0);
    expect(result.positionClosed).toBe(false);

    const result2 = await service.sell({
      userId: 'u1',
      marketId: 'm1',
      shares: pos!.shares - sellShares,
    });
    expect(result2.positionClosed).toBe(true);
    const closed = await db.getPosition('u1', 'm1', 'yes');
    expect(closed).not.toBeNull();
    expect(closed?.status).toBe('closed');
    expect(closed?.shares).toBe(0);
  });

  it('should ignore closed positions when selecting a position to sell', async () => {
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 50,
    });
    await service.buy({ userId: 'u1', marketId: 'm1', side: 'no', amount: 50 });

    const yesPos = await db.getPosition('u1', 'm1', 'yes');
    const noPos = await db.getPosition('u1', 'm1', 'no');
    expect(yesPos).not.toBeNull();
    expect(noPos).not.toBeNull();

    await service.sell({
      userId: 'u1',
      marketId: 'm1',
      positionId: yesPos!.id,
      shares: yesPos!.shares,
    });

    const sellNo = await service.sell({
      userId: 'u1',
      marketId: 'm1',
      shares: noPos!.shares,
    });
    expect(sellNo.positionClosed).toBe(true);
  });

  it('should require positionId when both sides exist', async () => {
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 50,
    });
    await service.buy({ userId: 'u1', marketId: 'm1', side: 'no', amount: 50 });
    await expect(
      service.sell({ userId: 'u1', marketId: 'm1', shares: 1 })
    ).rejects.toThrow(/Specify positionId/);
  });

  it('should block buys on resolved markets', async () => {
    await db.updateMarketState('m1', { resolved: true });
    await expect(
      service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 10 })
    ).rejects.toThrow(/resolved/);
  });

  it('should block buys on expired markets', async () => {
    await db.updateMarketState('m1', {
      resolved: false,
      endDate: new Date(Date.now() - 1000),
    });
    await expect(
      service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 10 })
    ).rejects.toThrow(/expired/);
  });

  it('should allow sells on expired but unresolved markets', async () => {
    // First buy a position while market is active
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });
    const pos = await db.getPosition('u1', 'm1', 'yes');
    expect(pos).not.toBeNull();

    // Expire the market (but don't resolve it)
    await db.updateMarketState('m1', {
      endDate: new Date(Date.now() - 1000),
    });

    // User should still be able to close their position
    const result = await service.sell({
      userId: 'u1',
      marketId: 'm1',
      shares: pos!.shares,
    });
    expect(result.positionClosed).toBe(true);
    expect(result.netProceeds).toBeGreaterThan(0);
  });

  it('should block sells on resolved markets with outcome', async () => {
    // First buy a position
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });

    // Resolve the market with an outcome (YES wins)
    await db.updateMarketState('m1', { resolved: true, resolution: true });

    await expect(
      service.sell({ userId: 'u1', marketId: 'm1', shares: 1 })
    ).rejects.toThrow(/resolved/);
  });

  it('should allow sells on cancelled markets (resolved but no outcome)', async () => {
    // First buy a position
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });

    // Cancel the market (resolved but no outcome)
    await db.updateMarketState('m1', { resolved: true, resolution: null });

    // Should be able to sell on cancelled market
    const result = await service.sell({
      userId: 'u1',
      marketId: 'm1',
      shares: 1,
    });
    expect(result.shares).toBe(1);
  });

  it('should block sells on cancelled positions (double-refund prevention)', async () => {
    // Security test: Ensure users cannot sell positions that have been refunded via cancel()
    // This prevents a double-payment exploit where user gets refund + sell proceeds

    // First buy a position
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });

    const balanceBeforeCancel = (await wallet.getBalance('u1')).balance;

    // Cancel the market - this refunds the position and marks it 'cancelled'
    const cancelResult = await service.cancel({
      marketId: 'm1',
      reason: 'Test cancel',
    });
    expect(cancelResult.positionsRefunded).toBe(1);
    expect(cancelResult.totalRefunded).toBeGreaterThan(0);

    const balanceAfterCancel = (await wallet.getBalance('u1')).balance;
    expect(balanceAfterCancel).toBeGreaterThan(balanceBeforeCancel);

    // Verify position is now cancelled
    const pos = await db.getPosition('u1', 'm1', 'yes');
    expect(pos?.status).toBe('cancelled');

    // Attempt to sell the cancelled position should fail
    // This is the critical security check - without it, user could get double payment
    await expect(
      service.sell({ userId: 'u1', marketId: 'm1', shares: 1 })
    ).rejects.toThrow(/not found/);
  });

  it('should prevent liquidity going negative on sell', async () => {
    // Force tiny liquidity but large reserves so proceeds exceed liquidity
    await db.updateMarketState('m1', { liquidity: 1 });
    const pos = await db.upsertPosition({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      shares: 100,
      avgPrice: 0.5,
    });
    await expect(
      service.sell({ userId: 'u1', marketId: 'm1', shares: pos.shares })
    ).rejects.toThrow(/liquidity/);
  });

  it('resolve should payout winners and set positions resolved', async () => {
    await service.buy({
      userId: 'u1',
      marketId: 'm1',
      side: 'yes',
      amount: 100,
    });
    await service.buy({
      userId: 'u2',
      marketId: 'm1',
      side: 'no',
      amount: 100,
    });

    const marketPreResolve = await service.getMarket('m1');
    expect(marketPreResolve).not.toBeNull();

    const preWinnerBalance = (await wallet.getBalance('u1')).balance;
    const preLoserBalance = (await wallet.getBalance('u2')).balance;
    await service.resolve({
      marketId: 'm1',
      winningSide: 'yes',
      resolutionDescription: 'It rained',
    });
    const pos1 = await db.getPosition('u1', 'm1', 'yes');
    const pos2 = await db.getPosition('u2', 'm1', 'no');
    expect(pos1?.status).toBe('resolved');
    expect(pos2?.status).toBe('resolved');
    const postWinnerBalance = (await wallet.getBalance('u1')).balance;
    const postLoserBalance = (await wallet.getBalance('u2')).balance;
    expect(postWinnerBalance).toBeGreaterThan(preWinnerBalance);
    expect(postLoserBalance).toBeLessThanOrEqual(preLoserBalance);

    // Liquidity should decrease by total payouts (capped at available liquidity)
    const marketAfterResolve = await service.getMarket('m1');
    expect(marketAfterResolve?.resolved).toBe(true);
    const payout = pos1?.shares ?? 0;
    const expectedReduction = Math.min(payout, marketPreResolve!.liquidity);
    expect(marketAfterResolve!.liquidity).toBeCloseTo(
      marketPreResolve!.liquidity - expectedReduction,
      6
    );

    // PnL should be recorded for both winner and loser (loser negative)
    const pnlByUser = new Map(wallet.pnls.map((p) => [p.userId, p.pnl]));
    const winnerPnl = pnlByUser.get('u1') ?? 0;
    const loserPnl = pnlByUser.get('u2') ?? 0;
    expect(loserPnl).toBeLessThan(0);
    expect(winnerPnl).toBeGreaterThan(loserPnl);
  });

  it('pricing getCurrentPrice returns 0.5 when total is zero for display', () => {
    expect(PredictionPricing.getCurrentPrice(0, 0, 'yes')).toBe(0.5);
  });

  // ---------------------------------------------------------------------------
  // Cancel edge cases (F25)
  // ---------------------------------------------------------------------------

  describe('cancel edge cases', () => {
    it('double-cancel should be idempotent (return zero refunds on second call)', async () => {
      await service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 100 });

      const first = await service.cancel({ marketId: 'm1', reason: 'void' });
      expect(first.positionsRefunded).toBe(1);
      expect(first.totalRefunded).toBeGreaterThan(0);

      const second = await service.cancel({ marketId: 'm1', reason: 'void again' });
      expect(second.positionsRefunded).toBe(0);
      expect(second.totalRefunded).toBe(0);
    });

    it('cancel after resolve should throw', async () => {
      await service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 100 });

      await service.resolve({
        marketId: 'm1',
        winningSide: 'yes',
        resolutionDescription: 'It rained',
      });

      await expect(
        service.cancel({ marketId: 'm1', reason: 'too late' })
      ).rejects.toThrow(/cannot cancel/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Resolve edge cases (F26)
  // ---------------------------------------------------------------------------

  describe('resolve edge cases', () => {
    it('double-resolve should be idempotent (second call is a no-op)', async () => {
      await service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 100 });

      await service.resolve({
        marketId: 'm1',
        winningSide: 'yes',
        resolutionDescription: 'First',
      });

      const balanceAfterFirst = (await wallet.getBalance('u1')).balance;

      // Second resolve should silently return (market.resolved is already true)
      await service.resolve({
        marketId: 'm1',
        winningSide: 'no',
        resolutionDescription: 'Second',
      });

      // Balance should not change on second resolve
      const balanceAfterSecond = (await wallet.getBalance('u1')).balance;
      expect(balanceAfterSecond).toBe(balanceAfterFirst);
    });

    it('resolve with NO outcome should pay NO holders (short-sellers win)', async () => {
      await service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 100 });
      await service.buy({ userId: 'u2', marketId: 'm1', side: 'no', amount: 100 });

      const preYesBalance = (await wallet.getBalance('u1')).balance;
      const preNoBalance = (await wallet.getBalance('u2')).balance;

      await service.resolve({
        marketId: 'm1',
        winningSide: 'no',
        resolutionDescription: 'It did not rain',
      });

      const postYesBalance = (await wallet.getBalance('u1')).balance;
      const postNoBalance = (await wallet.getBalance('u2')).balance;

      // NO holders get paid, YES holders do not
      expect(postNoBalance).toBeGreaterThan(preNoBalance);
      expect(postYesBalance).toBeLessThanOrEqual(preYesBalance);

      const pos1 = await db.getPosition('u1', 'm1', 'yes');
      const pos2 = await db.getPosition('u2', 'm1', 'no');
      expect(pos1?.outcome).toBe(false);
      expect(pos2?.outcome).toBe(true);
    });

    it('resolve with zero positions should complete without payouts', async () => {
      // Resolve a market that has no positions at all
      await service.resolve({
        marketId: 'm1',
        winningSide: 'yes',
        resolutionDescription: 'No one participated',
      });

      const resolvedMarket = await service.getMarket('m1');
      expect(resolvedMarket?.resolved).toBe(true);
      // No PnL records should exist
      expect(wallet.pnls.length).toBe(0);
    });

    it('resolve with mixed YES/NO positions pays only winners', async () => {
      // Create multiple users on both sides
      await service.buy({ userId: 'u1', marketId: 'm1', side: 'yes', amount: 200 });
      await service.buy({ userId: 'u2', marketId: 'm1', side: 'no', amount: 100 });
      await service.buy({ userId: 'u3', marketId: 'm1', side: 'yes', amount: 50 });

      const preU1 = (await wallet.getBalance('u1')).balance;
      const preU2 = (await wallet.getBalance('u2')).balance;
      const preU3 = (await wallet.getBalance('u3')).balance;

      await service.resolve({
        marketId: 'm1',
        winningSide: 'yes',
        resolutionDescription: 'It rained',
      });

      const postU1 = (await wallet.getBalance('u1')).balance;
      const postU2 = (await wallet.getBalance('u2')).balance;
      const postU3 = (await wallet.getBalance('u3')).balance;

      // YES holders (u1, u3) should receive payouts
      expect(postU1).toBeGreaterThan(preU1);
      expect(postU3).toBeGreaterThan(preU3);
      // NO holder (u2) should not receive payouts
      expect(postU2).toBeLessThanOrEqual(preU2);

      // All positions should be marked resolved
      const pos1 = await db.getPosition('u1', 'm1', 'yes');
      const pos2 = await db.getPosition('u2', 'm1', 'no');
      const pos3 = await db.getPosition('u3', 'm1', 'yes');
      expect(pos1?.status).toBe('resolved');
      expect(pos2?.status).toBe('resolved');
      expect(pos3?.status).toBe('resolved');

      // Winners have positive outcome, losers have false
      expect(pos1?.outcome).toBe(true);
      expect(pos2?.outcome).toBe(false);
      expect(pos3?.outcome).toBe(true);

      // PnL recorded for losers should be negative
      const loserPnl = wallet.pnls.find(
        (p) => p.userId === 'u2' && p.reason === 'pred_resolve'
      );
      expect(loserPnl).toBeDefined();
      expect(loserPnl!.pnl).toBeLessThan(0);
    });
  });
});
