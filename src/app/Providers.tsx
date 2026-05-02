import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { getDatabase } from '@/core/database/connection';
import { ServiceContainer } from '@/core/ServiceContainer';
import { ServiceContainerProvider } from '@/core/ServiceContainerContext';
import { Spinner } from '@/shared/components/ui/Spinner';
import { InstallPrompt } from '@/shared/components/ui/InstallPrompt';
import { ToastContainer } from '@/shared/components/ui/Toast';
import { useUiStore } from '@/stores/uiStore';

interface ProvidersProps {
  readonly children: React.ReactNode;
}

type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; container: ServiceContainer }
  | { status: 'error'; message: string };

function ReceiptConfigLoader({
  container,
}: {
  readonly container: ServiceContainer;
}): null {
  const setReceiptConfig = useUiStore((s) => s.setReceiptConfig);

  useEffect(() => {
    void container.settingsService.getAll().then((config) => {
      setReceiptConfig({
        spaName: config.receiptSpaName,
        tagline: config.receiptTagline,
        address: config.receiptAddress,
        phone: config.receiptPhone,
      });
    });
  }, [container, setReceiptConfig]);

  return null;
}

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
        <ReceiptConfigLoader container={state.container} />
        {children}
        <ToastContainer />
        <InstallPrompt />
      </BrowserRouter>
    </ServiceContainerProvider>
  );
};
