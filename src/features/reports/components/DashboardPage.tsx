import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Receipt, Star, Wallet, Lock, AlertTriangle } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { ROUTES } from '@/config/routes';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatDateTime } from '@/shared/utils/formatDate';
import { useAuthStore, selectUser } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/types';
import type { WeeklyRevenuePoint } from '@/features/transactions/types';
import { useDashboard } from '../hooks/useDashboard';
import { RecentTransactionsTable } from './RecentTransactionsTable';
import { CloseDayModal } from './CloseDayModal';

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
}

const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({ label, value, sub, icon: Icon, iconColor }) => (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="mt-1 text-xs text-text-tertiary">{sub}</p>
        </div>
        <div
          className="ml-3 shrink-0 rounded-lg p-2.5"
          style={{ background: iconColor + '18' }}
        >
          <Icon size={18} color={iconColor} />
        </div>
      </div>
    </div>
  ),
);
MetricCard.displayName = 'MetricCard';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const { state, refresh } = useDashboard();
  const [isCloseDayOpen, setIsCloseDayOpen] = useState(false);
  const canCloseDay = usePermission(Permission.CLOSE_DAY);
  const triggerRefresh = useUiStore((s) => s.triggerDashboardRefresh);

  const greeting = useCallback((): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleCloseDaySuccess = useCallback((): void => {
    triggerRefresh();
    refresh();
  }, [triggerRefresh, refresh]);

  if (state.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <p className="text-sm font-semibold text-red-600">
            Failed to load dashboard
          </p>
          <p className="mt-1 text-sm text-text-secondary">{state.error.message}</p>
          <Button variant="outline" onClick={refresh} className="mt-4">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (state.status !== 'success') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = state.data;
  const periodSub = stats.unclosedSince
    ? `since ${formatDateTime(stats.unclosedSince)}`
    : 'all time';

  return (
    <div className="p-9 max-w-[1200px]">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? ''}`}
        subtitle={todayFormatted}
        action={
          <div className="flex items-center gap-3">
            {canCloseDay && (
              <Button
                variant="outline"
                onClick={() => setIsCloseDayOpen(true)}
                leftIcon={<Lock size={14} />}
              >
                Close day
              </Button>
            )}
            <Button
              onClick={() => navigate(ROUTES.NEW_TRANSACTION)}
              leftIcon={
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              New transaction
            </Button>
          </div>
        }
      />

      {stats.hasUnclosedTransactions && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Unclosed transactions
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {stats.unclosedSince
                ? `Transactions recorded since last closure on ${formatDateTime(stats.unclosedSince)}. Close when ready.`
                : 'No day has been closed yet. Close when ready.'}
            </p>
          </div>
          {canCloseDay && (
            <Button
              size="sm"
              onClick={() => setIsCloseDayOpen(true)}
              className="shrink-0"
            >
              Close now
            </Button>
          )}
        </div>
      )}

      {/* Metric cards */}
      <div className="mb-6 flex gap-4">
        <MetricCard
          label="Revenue"
          value={formatCurrencyCompact(stats.totalRevenuePesewas)}
          sub={`${stats.transactionCount} sale${stats.transactionCount !== 1 ? 's' : ''} · ${periodSub}`}
          icon={TrendingUp}
          iconColor="#1D4D35"
        />
        <MetricCard
          label="Sales count"
          value={String(stats.transactionCount)}
          sub={periodSub}
          icon={Receipt}
          iconColor="#C4962A"
        />
        <MetricCard
          label="Top service"
          value={stats.topServiceName ?? '—'}
          sub={periodSub}
          icon={Star}
          iconColor="#7C3AED"
        />
        <MetricCard
          label="Cash in drawer"
          value={formatCurrencyCompact(stats.cashInDrawerPesewas)}
          sub={periodSub}
          icon={Wallet}
          iconColor="#EA580C"
        />
      </div>

      {/* Revenue chart */}
      <div className="mb-6 rounded-lg border border-border bg-white px-7 py-5">
        <p className="mb-1 text-sm font-semibold text-text-primary">
          Revenue — last 7 days
        </p>
        <p className="mb-5 text-xs text-text-secondary">
          {formatCurrencyCompact(
            stats.weeklyRevenue.reduce(
              (s: number, p: WeeklyRevenuePoint) => s + Math.round(p.revenueGhs * 100),
              0,
            ),
          )}{' '}
          total
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={stats.weeklyRevenue}>
            <defs>
              <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1D4D35" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#1D4D35" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 11, fill: '#8A9E90' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#8A9E90' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value ?? 0);
                return [formatCurrencyCompact(Math.round(n * 100)), 'Revenue'];
              }}
              contentStyle={{
                background: '#fff',
                border: '1px solid #DDE8E2',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenueGhs"
              stroke="#1D4D35"
              strokeWidth={2}
              fill="url(#rev-grad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent transactions */}
      <RecentTransactionsTable
        transactions={stats.recentTransactions}
        onViewAll={() => navigate(ROUTES.TRANSACTIONS)}
      />

      {/* Close Day modal */}
      {canCloseDay && (
        <CloseDayModal
          isOpen={isCloseDayOpen}
          onClose={() => setIsCloseDayOpen(false)}
          onSuccess={handleCloseDaySuccess}
          stats={stats}
        />
      )}
    </div>
  );
};

export default DashboardPage;
