import React from 'react';

import { Sidebar } from './Sidebar';

interface AppShellProps {
  readonly children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => (
  <div className="flex h-screen overflow-hidden bg-cream">
    <Sidebar />
    <main className="flex-1 overflow-auto">{children}</main>
  </div>
);
