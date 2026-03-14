import type { PerpSide } from './types';

export function calculateLiquidationPrice(
  entryPrice: number,
  side: PerpSide,
  leverage: number
): number {
  // Guard against division by zero - leverage must be >= 1
  if (leverage < 1) leverage = 1;
  const liquidationThreshold = 0.9 / leverage;
  if (side === 'long') {
    return entryPrice * (1 - liquidationThreshold);
  }
  return entryPrice * (1 + liquidationThreshold);
}

export function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  side: PerpSide,
  size: number
): { pnl: number; pnlPercent: number } {
  // Guard against division by zero and non-finite values
  if (
    entryPrice <= 0 ||
    size <= 0 ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(size)
  ) {
    return { pnl: 0, pnlPercent: 0 };
  }
  const pnl =
    side === 'long'
      ? ((currentPrice - entryPrice) / entryPrice) * size
      : ((entryPrice - currentPrice) / entryPrice) * size;
  const pnlPercent = (pnl / size) * 100;
  return { pnl, pnlPercent };
}
