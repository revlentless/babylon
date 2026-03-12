'use client';

interface MarketsCTAProps {
  onLogin: () => void;
}

/**
 * Call-to-action section for non-authenticated users.
 * Encourages users to connect their wallet to start trading.
 */
export function MarketsCTA({ onLogin }: MarketsCTAProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-brand/20 bg-gradient-to-br from-brand/10 to-purple-500/10 px-4 py-16">
      <h3 className="mb-2 font-bold text-2xl">Start Trading Today</h3>
      <p className="mb-6 max-w-md text-center text-muted-foreground text-sm">
        Log in to trade perpetual futures and prediction markets
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="cursor-pointer rounded-lg bg-brand px-8 py-3 font-medium text-primary-foreground shadow-brand/20 shadow-lg transition-colors hover:bg-brand-hover"
      >
        Connect Wallet
      </button>
    </div>
  );
}
