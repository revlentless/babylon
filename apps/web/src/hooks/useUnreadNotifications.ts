import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAuthToken } from '@/lib/auth';

const POLL_INTERVAL_MS = 60_000;

/**
 * Hook for polling the unread notification count.
 *
 * Polls `/api/notifications?unreadOnly=true&limit=1` every 60 seconds
 * while the user is authenticated. Resets to 0 on logout or when
 * unauthenticated.
 *
 * @returns The current unread notification count
 *
 * @example
 * ```tsx
 * const unreadNotifications = useUnreadNotifications();
 *
 * return (
 *   <span>{unreadNotifications > 0 && unreadNotifications}</span>
 * );
 * ```
 */
export function useUnreadNotifications(): number {
  const { authenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!authenticated || !user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      const token = getAuthToken();
      if (!token) return;

      try {
        const response = await fetch(
          '/api/notifications?unreadOnly=true&limit=1',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Silently fail — badge will show stale count
      }
    };

    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authenticated, user]);

  return unreadCount;
}
