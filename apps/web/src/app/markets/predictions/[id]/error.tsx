'use client';

/**
 * Error boundary for individual prediction market detail page.
 * Catches chart rendering errors and provides recovery UI.
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trackError } from '@/lib/errorTracking';

export default function PredictionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    trackError(error, {
      errorBoundary: 'prediction-detail',
      digest: error.digest,
      tags: { page: 'markets/predictions/[id]' },
    });
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-orange-500" />
        <h2 className="mb-2 font-bold text-2xl">Chart Loading Error</h2>
        <p className="mb-6 text-muted-foreground">
          There was an issue loading this prediction market. This may be due to
          a temporary connection issue.
        </p>
        {error.digest && (
          <p className="mb-4 text-muted-foreground text-xs">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={() => router.push('/markets?tab=predictions')}
            className="rounded-md bg-secondary px-6 py-2 text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            Back to Predictions
          </button>
        </div>
      </div>
    </div>
  );
}
