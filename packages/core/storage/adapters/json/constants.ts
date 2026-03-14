/**
 * Named constants for JSON adapter defaults.
 * Extracted from hardcoded magic numbers across adapter ports.
 */

/** Default trading balance for new actor states (string for decimal precision). */
export const DEFAULT_ACTOR_BALANCE = '10000';

/** Default reputation points for new actor states. */
export const DEFAULT_ACTOR_TRADING_BALANCE = 10000;

/** Default game speed in milliseconds (1 game-day per real minute). */
export const DEFAULT_GAME_SPEED_MS = 60000;

/** Default limit for price history queries. */
export const PRICE_HISTORY_LIMIT = 1440;

/** Default number of days for daily snapshot queries. */
export const DAILY_SNAPSHOT_DAYS = 30;

/** Default limit for market snapshot queries. */
export const DEFAULT_MARKET_LIMIT = 100;
