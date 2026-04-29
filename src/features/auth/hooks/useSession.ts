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
        // Warning handler — the LockScreen component reads session status
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
      recordActivity();
      sessionService.reset();
    };

    activityEvents.forEach((event) => document.addEventListener(event, handleActivity));

    return () => {
      activityEvents.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [isAuthenticated, sessionService, lock, recordActivity]);
}
