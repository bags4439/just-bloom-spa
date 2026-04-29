import { useCallback, useEffect, useState } from 'react';

import { useServices } from '@/core/ServiceContainerContext';
import type { AsyncState } from '@/shared/types';
import type { FullReport, DateRange } from '../types/report.types';

export function useReport(dateRange: DateRange): {
  state: AsyncState<FullReport>;
  reload: () => void;
} {
  const { reportService } = useServices();
  const [state, setState] = useState<AsyncState<FullReport>>({ status: 'loading' });

  const load = useCallback(async (): Promise<void> => {
    setState({ status: 'loading' });
    try {
      const data = await reportService.getFullReport(dateRange);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err : new Error('Failed to load report'),
      });
    }
  }, [reportService, dateRange]);

  useEffect(() => { void load(); }, [load]);

  return { state, reload: load };
}
