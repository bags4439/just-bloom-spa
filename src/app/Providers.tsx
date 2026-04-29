import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { getDatabase } from '@/core/database/connection';
import { ServiceContainer } from '@/core/ServiceContainer';
import { ServiceContainerProvider } from '@/core/ServiceContainerContext';
import { Spinner } from '@/shared/components/ui/Spinner';
import { ToastContainer } from '@/shared/components/ui/Toast';

interface ProvidersProps {
  readonly children: React.ReactNode;
}

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; container: ServiceContainer }
  | { status: 'error'; message: string };

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .then((db) => {
        if (cancelled) return;
        const container = ServiceContainer.initialize(db);
        setState({ status: 'ready', container });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Database failed to initialise',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-cream p-8 text-center">
        <div>
          <p className="text-base font-semibold text-red-700">Failed to start</p>
          <p className="mt-2 text-sm text-text-secondary">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <ServiceContainerProvider container={state.container}>
      <BrowserRouter>
        {children}
        <ToastContainer />
      </BrowserRouter>
    </ServiceContainerProvider>
  );
};
