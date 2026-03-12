'use client';

/**
 * Global Error Boundary for Next.js App Router
 *
 * This file catches errors that occur in the root layout or other global components.
 * It's separate from the regular error.tsx because it must be a client component
 * and wraps the entire application, including the root layout.
 *
 * Best practice: This is the last line of defense for errors in the app.
 */

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { trackError } from '@/lib/errorTracking';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackError(error, {
      errorBoundary: 'global',
      severity: 'fatal',
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center p-8 md:min-h-screen">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-destructive" />
            <h2 className="mb-2 font-bold text-2xl">Something went wrong</h2>
            <p className="mb-6 text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
            {error.digest && (
              <p className="mb-4 text-muted-foreground text-sm">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex justify-center gap-4">
              <button
                onClick={reset}
                className="rounded-md bg-primary px-6 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="rounded-md bg-secondary px-6 py-2 text-secondary-foreground transition-colors hover:bg-secondary/90"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
