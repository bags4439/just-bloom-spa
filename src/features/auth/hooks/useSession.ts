import { useEffect } from 'react';

import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';

export function useSession(): void {
  const { sessionService } = useServices();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { lock, recordActivity } = useSessionStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    sessionService.setHandlers(
      () => lock(),
      () => {
        useSessionStore.setState({ status: 'warning' });
      },
    );
    sessionService.start();

    const activityEvents: Array<keyof DocumentEventMap> = [
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    const handleActivity = (): void => {
      // Critical: do NOT reset the session timer when the screen is locked.
      // Any interaction while locked must NOT dismiss the lock screen.
      const { status } = useSessionStore.getState();
      if (status === 'locked') return;

      recordActivity();
      sessionService.reset();
    };

    activityEvents.forEach((event) =>
      document.addEventListener(event, handleActivity),
    );

    return () => {
      activityEvents.forEach((event) =>
        document.removeEventListener(event, handleActivity),
      );
    };
  }, [isAuthenticated, sessionService, lock, recordActivity]);
}
