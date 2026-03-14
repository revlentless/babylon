import { describe, expect, it } from 'vitest';
import {
  calculateDynamicFundingRate,
  calculateLiquidationPrice,
  calculateUnrealizedPnL,
} from '../PerpMarketService';

describe('calculateLiquidationPrice', () => {
  describe('long positions', () => {
    it('1x leverage: liquidation is 10% below entry', () => {
      const liq = calculateLiquidationPrice(100, 'long', 1);
      // threshold = 0.9 / 1 = 0.9, liq = 100 * (1 - 0.9) = 10
      expect(liq).toBeCloseTo(10, 4);
    });

    it('5x leverage: liquidation is 18% below entry', () => {
      const liq = calculateLiquidationPrice(100, 'long', 5);
      // threshold = 0.9 / 5 = 0.18, liq = 100 * (1 - 0.18) = 82
      expect(liq).toBeCloseTo(82, 4);
    });

    it('10x leverage: liquidation is 9% below entry', () => {
      const liq = calculateLiquidationPrice(100, 'long', 10);
      // threshold = 0.9 / 10 = 0.09, liq = 100 * (1 - 0.09) = 91
      expect(liq).toBeCloseTo(91, 4);
    });

    it('100x leverage: liquidation is 0.9% below entry', () => {
      const liq = calculateLiquidationPrice(100, 'long', 100);
      // threshold = 0.9 / 100 = 0.009, liq = 100 * (1 - 0.009) = 99.1
      expect(liq).toBeCloseTo(99.1, 4);
    });
  });

  describe('short positions', () => {
    it('1x leverage: liquidation is 90% above entry', () => {
      const liq = calculateLiquidationPrice(100, 'short', 1);
      // threshold = 0.9 / 1 = 0.9, liq = 100 * (1 + 0.9) = 190
      expect(liq).toBeCloseTo(190, 4);
    });

    it('5x leverage: liquidation is 18% above entry', () => {
      const liq = calculateLiquidationPrice(100, 'short', 5);
      // threshold = 0.9 / 5 = 0.18, liq = 100 * (1 + 0.18) = 118
      expect(liq).toBeCloseTo(118, 4);
    });

    it('10x leverage: liquidation is 9% above entry', () => {
      const liq = calculateLiquidationPrice(100, 'short', 10);
      expect(liq).toBeCloseTo(109, 4);
    });

    it('100x leverage: liquidation is 0.9% above entry', () => {
      const liq = calculateLiquidationPrice(100, 'short', 100);
      expect(liq).toBeCloseTo(100.9, 4);
    });
  });

  describe('edge cases', () => {
    it('leverage < 1 is clamped to 1', () => {
      const liq = calculateLiquidationPrice(100, 'long', 0.5);
      const liqAt1 = calculateLiquidationPrice(100, 'long', 1);
      expect(liq).toBeCloseTo(liqAt1, 4);
    });

    it('higher leverage means tighter liquidation', () => {
      const liq5x = calculateLiquidationPrice(100, 'long', 5);
      const liq10x = calculateLiquidationPrice(100, 'long', 10);
      const liq100x = calculateLiquidationPrice(100, 'long', 100);
      // Higher leverage = closer to entry = higher liquidation price for longs
      expect(liq100x).toBeGreaterThan(liq10x);
      expect(liq10x).toBeGreaterThan(liq5x);
    });
  });
});

describe('calculateUnrealizedPnL', () => {
  describe('long positions', () => {
    it('in profit when price rises', () => {
      const { pnl, pnlPercent } = calculateUnrealizedPnL(100, 120, 'long', 1000);
      // pnl = (120-100)/100 * 1000 = 200
      expect(pnl).toBeCloseTo(200, 4);
      expect(pnlPercent).toBeCloseTo(20, 4);
    });

    it('in loss when price drops', () => {
      const { pnl, pnlPercent } = calculateUnrealizedPnL(100, 80, 'long', 1000);
      // pnl = (80-100)/100 * 1000 = -200
      expect(pnl).toBeCloseTo(-200, 4);
      expect(pnlPercent).toBeCloseTo(-20, 4);
    });
  });

  describe('short positions', () => {
    it('in profit when price drops', () => {
      const { pnl, pnlPercent } = calculateUnrealizedPnL(100, 80, 'short', 1000);
      // pnl = (100-80)/100 * 1000 = 200
      expect(pnl).toBeCloseTo(200, 4);
      expect(pnlPercent).toBeCloseTo(20, 4);
    });

    it('in loss when price rises', () => {
      const { pnl, pnlPercent } = calculateUnrealizedPnL(100, 120, 'short', 1000);
      // pnl = (100-120)/100 * 1000 = -200
      expect(pnl).toBeCloseTo(-200, 4);
      expect(pnlPercent).toBeCloseTo(-20, 4);
    });
  });

  describe('zero PnL', () => {
    it('returns zero when entry equals current price (long)', () => {
      const { pnl, pnlPercent } = calculateUnrealizedPnL(100, 100, 'long', 500);
      expect(pnl).toBe(0);
      expect(pnlPercent).toBe(0);
    });

    it('returns zero when entry equals current price (short)', () => {
      const { pnl, pnlPercent } = calculateUnrealizedPnL(100, 100, 'short', 500);
      expect(pnl).toBe(0);
      expect(pnlPercent).toBe(0);
    });
  });

  describe('guard clauses', () => {
    it('returns zero for non-positive entry price', () => {
      const { pnl } = calculateUnrealizedPnL(0, 100, 'long', 100);
      expect(pnl).toBe(0);
    });

    it('returns zero for non-positive size', () => {
      const { pnl } = calculateUnrealizedPnL(100, 120, 'long', 0);
      expect(pnl).toBe(0);
    });

    it('returns zero for non-finite inputs', () => {
      const { pnl } = calculateUnrealizedPnL(100, Infinity, 'long', 100);
      expect(pnl).toBe(0);
    });
  });
});

describe('calculateDynamicFundingRate', () => {
  describe('balanced market', () => {
    it('returns near-base rate with equal long/short OI', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 1000,
        shortOpenInterest: 1000,
      });
      // imbalance = 0 => annualRate = baseFundingRate (0.01)
      expect(result.imbalance).toBeCloseTo(0, 4);
      expect(result.annualRate).toBeCloseTo(0.01, 4);
      expect(result.paymentDirection).toBe('balanced');
      expect(result.isSeverelyImbalanced).toBe(false);
    });

    it('treats small imbalance (<5%) as balanced', () => {
      // 510 long, 490 short => imbalance = 20/1000 = 0.02
      const result = calculateDynamicFundingRate({
        longOpenInterest: 510,
        shortOpenInterest: 490,
      });
      expect(result.paymentDirection).toBe('balanced');
    });
  });

  describe('heavy long imbalance', () => {
    it('returns positive rate when longs dominate', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 1000,
        shortOpenInterest: 200,
      });
      // imbalance = 800/1200 = 0.667 => positive
      expect(result.annualRate).toBeGreaterThan(0);
      expect(result.paymentDirection).toBe('longs_pay');
    });
  });

  describe('heavy short imbalance', () => {
    it('returns negative rate when shorts dominate', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 200,
        shortOpenInterest: 1000,
      });
      expect(result.annualRate).toBeLessThan(0);
      expect(result.paymentDirection).toBe('shorts_pay');
    });
  });

  describe('zero OI', () => {
    it('returns base rate with balanced direction', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 0,
        shortOpenInterest: 0,
      });
      expect(result.annualRate).toBeCloseTo(0.01, 4);
      expect(result.imbalance).toBe(0);
      expect(result.paymentDirection).toBe('balanced');
      expect(result.isSeverelyImbalanced).toBe(false);
    });
  });

  describe('one-sided market', () => {
    it('caps at MAX_FUNDING_RATE for all-long market', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 10000,
        shortOpenInterest: 0,
      });
      // imbalance = 1.0, rate = base + (max-base)*1^3 = max = 0.5
      expect(result.annualRate).toBeCloseTo(0.5, 4);
      expect(result.isSeverelyImbalanced).toBe(true);
    });

    it('caps at -MAX_FUNDING_RATE for all-short market', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 0,
        shortOpenInterest: 10000,
      });
      expect(result.annualRate).toBeCloseTo(-0.5, 4);
      expect(result.isSeverelyImbalanced).toBe(true);
    });
  });

  describe('severe imbalance threshold', () => {
    it('flags severe imbalance when abs(imbalance) > 0.4', () => {
      // 800 long, 200 short => imbalance = 600/1000 = 0.6
      const result = calculateDynamicFundingRate({
        longOpenInterest: 800,
        shortOpenInterest: 200,
      });
      expect(result.isSeverelyImbalanced).toBe(true);
    });

    it('does not flag when imbalance <= 0.4', () => {
      // 600 long, 400 short => imbalance = 200/1000 = 0.2
      const result = calculateDynamicFundingRate({
        longOpenInterest: 600,
        shortOpenInterest: 400,
      });
      expect(result.isSeverelyImbalanced).toBe(false);
    });
  });

  describe('custom parameters', () => {
    it('respects custom base and max funding rates', () => {
      const result = calculateDynamicFundingRate({
        longOpenInterest: 10000,
        shortOpenInterest: 0,
        baseFundingRate: 0.02,
        maxFundingRate: 1.0,
      });
      // One-sided: rate = base + (max-base)*1^3 = 0.02 + 0.98 = 1.0
      expect(result.annualRate).toBeCloseTo(1.0, 4);
    });
  });
});
