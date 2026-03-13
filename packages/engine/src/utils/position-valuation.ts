/**
 * Shared helpers for computing position values across portfolio and points
 * calculations. Extracted from portfolio-breakdown.ts and total-points-service.ts
 * to eliminate duplication.
 */

import { PredictionPricing } from '@babylon/core/markets/prediction';
import { FEE_CONFIG } from '../config/fees';

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function clampFeeRate(rate: number): number {
  return rate > 0 && rate < 1 ? rate : 0;
}

export function calculatePerpPositionValue(position: {
  size: unknown;
  leverage: unknown;
  unrealizedPnL: unknown;
}): number {
  const size = toNumber(position.size);
  const leverage = toNumber(position.leverage);
  const unrealizedPnL = toNumber(position.unrealizedPnL);

  const effectiveLeverage =
    Number.isFinite(leverage) && leverage > 0 ? leverage : 1;
  const margin = Math.abs(size / effectiveLeverage);
  return margin + unrealizedPnL;
}

export function calculatePredictionPositionValue(position: {
  shares: unknown;
  avgPrice: unknown;
  side: boolean | null;
  marketYesShares: unknown;
  marketNoShares: unknown;
}): number {
  const shares = toNumber(position.shares);
  const avgPrice = toNumber(position.avgPrice);

  const yesShares = toNumber(position.marketYesShares);
  const noShares = toNumber(position.marketNoShares);

  const feeRate = clampFeeRate(FEE_CONFIG.TRADING_FEE_RATE);
  const costBasisNet = shares * avgPrice;
  const costBasis = feeRate > 0 ? costBasisNet / (1 - feeRate) : costBasisNet;

  if (shares <= 0 || yesShares <= 0 || noShares <= 0) {
    return costBasis;
  }

  const sideKey = position.side ? 'yes' : 'no';
  try {
    const sellPreview = PredictionPricing.calculateSellWithFees(
      yesShares,
      noShares,
      sideKey,
      shares,
      feeRate
    );
    return sellPreview.netProceeds ?? sellPreview.totalCost;
  } catch {
    // Fall back to cost basis when sell preview fails (e.g. negative proceeds)
    return costBasis;
  }
}
