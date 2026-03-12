'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to lock body scroll when a condition is true.
 *
 * Saves and restores the original `document.body.style.overflow` value.
 * Safe for SSR — checks for `document` before accessing it.
 *
 * @param isLocked - Whether body scroll should be locked
 *
 * @example
 * ```tsx
 * function Modal({ isOpen }: { isOpen: boolean }) {
 *   useScrollLock(isOpen);
 *   if (!isOpen) return null;
 *   return <div>Modal content</div>;
 * }
 * ```
 */
export function useScrollLock(isLocked: boolean): void {
  const originalOverflowRef = useRef<string>('');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isLocked) {
      originalOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflowRef.current;
      };
    }

    return undefined;
  }, [isLocked]);
}
