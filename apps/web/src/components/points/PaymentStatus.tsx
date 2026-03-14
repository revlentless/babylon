import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/shared/Skeleton';

interface PaymentProcessingProps {
  step: 'payment' | 'verifying';
  txHash: string | null;
  getExplorerTxUrl: (hash: string) => string | null;
}

export function PaymentProcessing({
  step,
  txHash,
  getExplorerTxUrl,
}: PaymentProcessingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-6">
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
      <h3 className="mb-2 font-semibold text-foreground text-lg">
        {step === 'payment'
          ? 'Processing Payment...'
          : 'Verifying Transaction...'}
      </h3>
      <p className="mb-6 text-center text-muted-foreground text-sm">
        {step === 'payment'
          ? 'Preparing your payment transaction...'
          : 'Confirming your payment on the blockchain'}
      </p>
      {txHash && getExplorerTxUrl(txHash) && (
        <a
          data-testid="transaction-hash-link"
          href={getExplorerTxUrl(txHash)!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm hover:underline"
        >
          View transaction →
        </a>
      )}
    </div>
  );
}

interface PaymentSuccessProps {
  pointsAwarded: number;
  txHash: string | null;
  getExplorerTxUrl: (hash: string) => string | null;
  onClose: () => void;
}

export function PaymentSuccess({
  pointsAwarded,
  txHash,
  getExplorerTxUrl,
  onClose,
}: PaymentSuccessProps) {
  return (
    <div
      data-testid="payment-success"
      className="flex flex-col items-center justify-center py-12"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
      </div>
      <h3 className="mb-2 font-semibold text-foreground text-lg">
        Purchase Successful!
      </h3>
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-yellow-500" />
        <span
          data-testid="points-awarded-amount"
          className="font-bold text-2xl text-foreground"
        >
          {pointsAwarded.toLocaleString()}
        </span>
        <span className="text-muted-foreground">points added</span>
      </div>
      {txHash && getExplorerTxUrl(txHash) && (
        <a
          href={getExplorerTxUrl(txHash)!}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 text-primary text-sm hover:underline"
        >
          View transaction →
        </a>
      )}
      <button
        onClick={onClose}
        className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Done
      </button>
    </div>
  );
}

interface PaymentErrorProps {
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function PaymentError({ error, onClose, onRetry }: PaymentErrorProps) {
  return (
    <div
      data-testid="payment-error"
      className="flex flex-col items-center justify-center py-12"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertCircle className="h-10 w-10 text-red-500" />
      </div>
      <h3 className="mb-2 font-semibold text-foreground text-lg">
        Payment Failed
      </h3>
      <p
        data-testid="payment-error-message"
        className="mb-8 text-center text-muted-foreground text-sm"
      >
        {error || 'An error occurred during payment'}
      </p>
      <div className="flex w-full gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border-2 border-border py-3 font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={onRetry}
          className="flex-1 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
