import React, { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { useServices } from '@/core/ServiceContainerContext';
import { LockScreen } from '@/features/auth/components/LockScreen';
import { PasswordChangeModal } from '@/features/auth/components/PasswordChangeModal';
import { useSession } from '@/features/auth/hooks/useSession';
import { AppShell } from '@/shared/components/layout/AppShell';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useAuthStore, selectIsAuthenticated, selectUser } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';

const LoginPage = React.lazy(() => import('@/features/auth/components/LoginPage'));
const FirstRunSetup = React.lazy(() => import('@/features/auth/components/FirstRunSetup'));
const DashboardPage = React.lazy(() => import('@/features/reports/components/DashboardPage'));
const NewTransactionPage = React.lazy(
  () => import('@/features/transactions/components/NewTransactionPage'),
);
const TransactionsPage = React.lazy(
  () => import('@/features/transactions/components/TransactionsPage'),
);

function LoadingFallback(): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center bg-cream">
      <Spinner size="lg" />
    </div>
  );
}

function AuthenticatedApp(): React.ReactElement {
  useSession();
  const sessionStatus = useSessionStore((s) => s.status);
  const user = useAuthStore(selectUser);

  return (
    <>
      {sessionStatus === 'locked' && <LockScreen />}
      {user?.mustChangePassword && (
        <PasswordChangeModal isOpen={true} isFirstLogin={user.mustChangePassword} />
      )}
      <AppShell>
        <Routes>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.NEW_TRANSACTION} element={<NewTransactionPage />} />
          <Route path={ROUTES.TRANSACTIONS} element={<TransactionsPage />} />
          <Route
            path={ROUTES.CUSTOMERS}
            element={<div className="p-10 text-sm text-text-secondary">Customers — coming soon</div>}
          />
          <Route
            path={ROUTES.REPORTS}
            element={<div className="p-10 text-sm text-text-secondary">Reports — coming soon</div>}
          />
          <Route
            path={ROUTES.SETTINGS}
            element={<div className="p-10 text-sm text-text-secondary">Settings — coming soon</div>}
          />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </AppShell>
    </>
  );
}

function AppRoutes(): React.ReactElement {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { authService } = useServices();
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      const result = await authService.hasAnyUsers();
      if (!cancelled) setHasUsers(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [authService]);

  if (hasUsers === null) return <LoadingFallback />;

  if (!hasUsers && !isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<FirstRunSetup />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

export const AppRouter: React.FC = () => (
  <Suspense fallback={<LoadingFallback />}>
    <AppRoutes />
  </Suspense>
);
