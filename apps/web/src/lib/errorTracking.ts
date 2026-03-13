'use client';

/**
 * Shared error tracking utility.
 *
 * Consolidates Sentry + PostHog error capture into a single call so every
 * error boundary reports to both services consistently.
 */

import * as Sentry from '@sentry/nextjs';
import { posthog } from '@/lib/posthog';

interface ErrorTrackingOptions {
  /** Identifies which error boundary caught this error (e.g. "global", "route", "panel"). */
  errorBoundary: string;
  /** Sentry severity level. Defaults to "error". */
  severity?: Sentry.SeverityLevel;
  /** Next.js error digest, if available. */
  digest?: string;
  /** React component stack from componentDidCatch errorInfo. */
  componentStack?: string | null;
  /** Arbitrary extra tags forwarded to Sentry. */
  tags?: Record<string, string>;
}

/**
 * Report an error to both Sentry and PostHog in one call.
 *
 * All error boundaries and error pages should use this instead of calling
 * Sentry / PostHog directly.
 */
export function trackError(error: Error, options: ErrorTrackingOptions): void {
  const { errorBoundary, severity, digest, componentStack, tags } = options;

  // ── Sentry ───────────────────────────────────────────────
  Sentry.withScope((scope) => {
    scope.setTag('errorBoundary', errorBoundary);
    scope.setTag('surface', 'react');

    if (severity) {
      scope.setLevel(severity);
    }

    if (digest) {
      scope.setTag('errorDigest', digest);
    }

    if (componentStack) {
      scope.setContext('react', { componentStack });
    }

    if (tags) {
      for (const [key, value] of Object.entries(tags)) {
        scope.setTag(key, value);
      }
    }

    Sentry.captureException(error);
  });

  // ── PostHog ──────────────────────────────────────────────
  if (posthog) {
    const properties: Record<string, string | boolean> = {
      $exception_type: error.name || 'Error',
      $exception_message: error.message,
      errorBoundary,
    };

    if (error.stack) {
      properties.$exception_stack = error.stack;
    }

    if (digest) {
      properties.digest = digest;
    }

    if (componentStack) {
      properties.componentStack = componentStack;
    }

    if (severity) {
      properties.severity = severity;
    }

    posthog.capture('$exception', properties);
  }
}
