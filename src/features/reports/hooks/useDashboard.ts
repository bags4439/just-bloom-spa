import { useCallback, useEffect, useState } from 'react';

import { useServices } from '@/core/ServiceContainerContext';
import { useUiStore } from '@/stores/uiStore';
import type { AsyncState } from '@/shared/types';
import type { DashboardStats } from '../types';

export function useDashboard(): {
  state: AsyncState<DashboardStats>;
  refresh: () => void;
} {
  const { dashboardService } = useServices();
  const refreshKey = useUiStore((s) => s.dashboardRefreshKey);
  const [state, setState] = useState<AsyncState<DashboardStats>>({
    status: 'loading',
  });

  const load = useCallback(async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const data = await dashboardService.getStats();
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err : new Error('Failed to load dashboard'),
      });
    }
  }, [dashboardService]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      void load();
    });
    return (): void => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  return { state, refresh: load };
}
