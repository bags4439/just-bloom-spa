/* eslint-disable react-refresh/only-export-components -- context module exports provider + hook */
import React, { createContext, useContext } from 'react';

import type { ServiceContainer } from './ServiceContainer';

const ServiceContainerContext = createContext<ServiceContainer | null>(null);

interface ServiceContainerProviderProps {
  readonly container: ServiceContainer;
  readonly children: React.ReactNode;
}

export const ServiceContainerProvider: React.FC<ServiceContainerProviderProps> = ({
  container,
  children,
}) => (
  <ServiceContainerContext.Provider value={container}>{children}</ServiceContainerContext.Provider>
);

export function useServices(): ServiceContainer {
  const ctx = useContext(ServiceContainerContext);
  if (!ctx) throw new Error('useServices must be used within ServiceContainerProvider');
  return ctx;
}
