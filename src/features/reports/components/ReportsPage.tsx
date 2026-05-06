import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, Receipt, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useServices } from '@/core/ServiceContainerContext';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { exportCsv } from '@/shared/utils/exportCsv';
import { getDateRanges } from '@/shared/utils/dateRanges';
import { formatDateTime } from '@/shared/utils/formatDate';
import { cn } from '@/shared/utils/cn';
import { useReport } from '../hooks/useReport';
import type { DateRange } from '../types/report.types';
import type { DayClosure } from '../types';

// ─── Date range picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const presets = getDateRanges();
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const isPresetActive = (key: string): boolean => {
    const preset = presets[key];
    return preset?.from === value.from && preset?.to === value.to;
  };

  const handleCustomApply = useCallback((): void => {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;
    onChange({ from: customFrom, to: customTo, label: 'Custom' });
    setShowCustom(false);
  }, [customFrom, customTo, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(presets).map(([key, preset]) => (
        <button
          key={key}
          onClick={() => { onChange(preset); setShowCustom(false); }}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
            isPresetActive(key)
              ? 'border-primary bg-primary-pale text-primary'
              : 'border-border bg-white text-text-secondary hover:bg-cream',
          )}
        >
          {preset.label}
        </button>
      ))}
      <button
        onClick={() => setShowCustom((s) => !s)}
        className={cn(
          'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
          value.label === 'Custom'
            ? 'border-primary bg-primary-pale text-primary'
            : 'border-border bg-white text-text-secondary hover:bg-cream',
        )}
      >
        Custom
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 shadow-card">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border border-border bg-cream px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-text-tertiary">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border border-border bg-cream px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" onClick={handleCustomApply}>Apply</Button>
        </div>
      )}
    </div>
  );
};

// ─── Summary cards ────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  positive?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = React.memo(
  ({ label, value, sub, icon: Icon, iconColor, positive }) => (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
          <p
            className={cn(
              'text-xl font-bold',
              positive === false ? 'text-red-600' : 'text-text-primary',
            )}
          >
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-text-tertiary">{sub}</p>}
        </div>
        <div className="ml-3 shrink-0 rounded-lg p-2" style={{ background: iconColor + '18' }}>
          <Icon size={17} color={iconColor} />
        </div>
      </div>
    </div>
  ),
);
SummaryCard.displayName = 'SummaryCard';

// ─── Section header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  onExport: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onExport }) => (
  <div className="flex items-center justify-between border-b border-border px-6 py-4">
    <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      leftIcon={<Download size={12} />}
    >
      Export CSV
    </Button>
  </div>
);

// ─── Channel badge colour ─────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  cash: '#1D4D35',
  momo: '#C45600',
  bank: '#1D4ED8',
  split: '#6D28D9',
};

// ─── Main reports page ────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const ranges = getDateRanges();
  const [dateRange, setDateRange] = useState<DateRange>(ranges['today']!);
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');
  const { state } = useReport(dateRange);
  const { dashboardService } = useServices();
  const [closures, setClosures] = useState<DayClosure[]>([]);
  const [isLoadingClosures, setIsLoadingClosures] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingClosures(true);
    void (async (): Promise<void> => {
      try {
        const data = await dashboardService.getClosureHistory(
          dateRange.from,
          dateRange.to,
        );
        if (!cancelled) {
          setClosures(data);
        }
      } catch {
        if (!cancelled) {
          setClosures([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingClosures(false);
        }
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [dashboardService, dateRange.from, dateRange.to]);

  const handleExportRevenue = useCallback((): void => {
    if (state.status !== 'success') return;
    const { revenue } = state.data;
    exportCsv(`revenue_${dateRange.from}_${dateRange.to}`, [
      { Metric: 'Total revenue', Value: formatCurrencyCompact(revenue.totalRevenuePesewas) },
      { Metric: 'Total expenses', Value: formatCurrencyCompact(revenue.totalExpensesPesewas) },
      { Metric: 'Other income', Value: formatCurrencyCompact(revenue.totalOtherIncomePesewas) },
      { Metric: 'Net position', Value: formatCurrencyCompact(revenue.netPositionPesewas) },
      { Metric: 'Transactions', Value: String(revenue.transactionCount) },
      { Metric: 'Avg transaction', Value: formatCurrencyCompact(revenue.averageTransactionPesewas) },
    ]);
  }, [state, dateRange]);

  const handleExportServices = useCallback((): void => {
    if (state.status !== 'success') return;
    exportCsv(
      `services_${dateRange.from}_${dateRange.to}`,
      state.data.servicePopularity.map((r) => ({
        Service: r.serviceName,
        Category: r.categoryName,
        Sessions: r.sessionCount,
        Revenue: formatCurrencyCompact(r.revenuePesewas),
      })),
    );
  }, [state, dateRange]);

  const handleExportStaff = useCallback((): void => {
    if (state.status !== 'success') return;
    exportCsv(
      `staff_${dateRange.from}_${dateRange.to}`,
      state.data.staffPerformance.map((r) => ({
        Staff: r.staffName,
        Transactions: r.transactionCount,
        Revenue: formatCurrencyCompact(r.revenuePesewas),
        'Top service': r.topService ?? '—',
      })),
    );
  }, [state, dateRange]);

  const handleExportCustomers = useCallback((): void => {
    if (state.status !== 'success') return;
    exportCsv(
      `customers_${dateRange.from}_${dateRange.to}`,
      state.data.topCustomers.map((r) => ({
        Customer: r.customerName,
        Visits: r.visitCount,
        'Total spend': formatCurrencyCompact(r.totalSpendPesewas),
        'Loyalty points': r.loyaltyPoints,
      })),
    );
  }, [state, dateRange]);

  const handleExportClosures = useCallback((): void => {
    if (closures.length === 0) return;
    exportCsv(
      `day_closures_${dateRange.from}_${dateRange.to}`,
      closures.map((c) => ({
        Date: c.closeDate,
        'Closed at': formatDateTime(c.closedAt),
        'Closed by': c.closedByName || c.closedBy,
        'Expected (GHS)': formatCurrencyCompact(c.expectedCashPesewas),
        'Actual (GHS)': formatCurrencyCompact(c.actualCashPesewas),
        'Discrepancy (GHS)': formatCurrencyCompact(c.discrepancyPesewas),
        Note: c.notes ?? '',
      })),
    );
  }, [closures, dateRange]);

  const chartData = useMemo(() => {
    if (state.status !== 'success') return [];
    return state.data.dailyRevenue.map((d) => ({
      name: d.dayLabel,
      revenue: d.revenuePesewas / 100,
    }));
  }, [state]);

  const monthlyChartData = useMemo(() => {
    if (state.status !== 'success') return [];
    return state.data.monthlyRevenue.map((d) => ({
      name: d.monthLabel,
      revenue: d.revenuePesewas / 100,
    }));
  }, [state]);

  const handleChartViewDaily = useCallback((): void => {
    setChartView('daily');
  }, []);

  const handleChartViewMonthly = useCallback((): void => {
    setChartView('monthly');
  }, []);

  const handleExportExpenseBreakdown = useCallback((): void => {
    if (state.status !== 'success' || state.data.expenseBreakdown.length === 0) return;
    exportCsv(
      `expenses_by_category_${dateRange.from}_${dateRange.to}`,
      state.data.expenseBreakdown.map((r) => ({
        Category: r.category,
        Count: r.count,
        Total: formatCurrencyCompact(r.totalPesewas),
        Share: `${r.percentage}%`,
      })),
    );
  }, [state, dateRange]);

  if (state.status === 'loading' || state.status === 'idle') {
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
          <p className="text-sm font-semibold text-red-600">Failed to load report</p>
          <p className="mt-1 text-sm text-text-secondary">{state.error.message}</p>
        </div>
      </div>
    );
  }

  const {
    revenue,
    servicePopularity,
    staffPerformance,
    topCustomers,
    expenseBreakdown,
    yearToDateRevenue,
  } = state.data;

  const activeChartData = chartView === 'daily' ? chartData : monthlyChartData;
  const isChartEmpty =
    activeChartData.length === 0 ||
    activeChartData.every((d) => d.revenue === 0);
  const chartBarSize =
    chartView === 'monthly'
      ? 18
      : chartData.length > 14
        ? 6
        : 18;
  const chartXInterval =
    chartView === 'monthly'
      ? 0
      : chartData.length > 14
        ? Math.floor(chartData.length / 7)
        : 0;

  return (
    <div className="p-9 max-w-[1200px]">
      <PageHeader
        title="Reports"
        subtitle={`${dateRange.label} · ${dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} to ${dateRange.to}`}`}
        action={<DateRangePicker value={dateRange} onChange={setDateRange} />}
      />

      {/* Summary cards */}
      <div className="mb-6 flex flex-wrap gap-4">
        <SummaryCard
          label="Total revenue"
          value={formatCurrencyCompact(revenue.totalRevenuePesewas)}
          sub={`${revenue.transactionCount} transactions`}
          icon={TrendingUp}
          iconColor="#1D4D35"
        />
        <SummaryCard
          label="Total expenses"
          value={formatCurrencyCompact(revenue.totalExpensesPesewas)}
          sub="Outbound cash"
          icon={TrendingDown}
          iconColor="#B91C1C"
          positive={false}
        />
        <SummaryCard
          label="Other income"
          value={formatCurrencyCompact(revenue.totalOtherIncomePesewas)}
          sub="Non-customer inflow"
          icon={DollarSign}
          iconColor="#C4962A"
        />
        <SummaryCard
          label="Net position"
          value={formatCurrencyCompact(revenue.netPositionPesewas)}
          sub="Revenue + income − expenses"
          icon={Receipt}
          iconColor={revenue.netPositionPesewas >= 0 ? '#1D4D35' : '#B91C1C'}
          positive={revenue.netPositionPesewas >= 0}
        />
        <div className="min-w-[200px] flex-1 rounded-lg border border-border bg-white p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {yearToDateRevenue.year} revenue to date
          </p>
          <p className="text-xl font-bold text-text-primary">
            {formatCurrencyCompact(yearToDateRevenue.revenuePesewas)}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {yearToDateRevenue.transactionCount} transactions this year
          </p>
        </div>
      </div>

      {/* Revenue chart + channel breakdown */}
      <div className="mb-6 flex gap-5">
        <div className="flex-[3] rounded-lg border border-border bg-white px-6 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {chartView === 'daily' ? 'Daily revenue' : 'Monthly revenue'}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                GHS — selected period
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={handleChartViewDaily}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold transition-colors',
                    chartView === 'daily'
                      ? 'bg-primary text-white'
                      : 'bg-white text-text-secondary hover:bg-cream',
                  )}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={handleChartViewMonthly}
                  className={cn(
                    'border-l border-border px-3 py-1.5 text-xs font-semibold transition-colors',
                    chartView === 'monthly'
                      ? 'bg-primary text-white'
                      : 'bg-white text-text-secondary hover:bg-cream',
                  )}
                >
                  Monthly
                </button>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportRevenue} leftIcon={<Download size={12} />}>
                Export CSV
              </Button>
            </div>
          </div>
          {isChartEmpty ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-text-tertiary">No revenue data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activeChartData} barSize={chartBarSize}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#8A9E90' }}
                  axisLine={false}
                  tickLine={false}
                  interval={chartXInterval}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8A9E90' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrencyCompact(Math.round((Number(value) || 0) * 100)),
                    'Revenue',
                  ]}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #DDE8E2',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="#1D4D35" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex-[2] rounded-lg border border-border bg-white px-6 py-5">
          <p className="mb-5 text-sm font-semibold text-text-primary">By payment channel</p>
          {revenue.byChannel.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-text-tertiary">No data for this period</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {revenue.byChannel.map((ch) => {
                const pct =
                  revenue.totalRevenuePesewas > 0
                    ? (ch.amountPesewas / revenue.totalRevenuePesewas) * 100
                    : 0;
                return (
                  <div key={ch.channel}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold uppercase text-text-primary">
                        {ch.channel}
                      </span>
                      <span className="text-text-secondary">
                        {formatCurrencyCompact(ch.amountPesewas)} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: CHANNEL_COLORS[ch.channel] ?? '#1D4D35',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 border-t border-border pt-3 text-xs text-text-tertiary">
                Avg transaction: {formatCurrencyCompact(revenue.averageTransactionPesewas)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service popularity */}
      <div className="mb-6 rounded-lg border border-border bg-white">
        <SectionHeader title="Service popularity" onExport={handleExportServices} />
        {servicePopularity.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-tertiary">No service data for this period</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-cream">
                {['#', 'Service', 'Category', 'Sessions', 'Revenue', 'Share'].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicePopularity.map((row, i) => {
                const pct =
                  revenue.totalRevenuePesewas > 0
                    ? (row.revenuePesewas / revenue.totalRevenuePesewas) * 100
                    : 0;
                return (
                  <tr key={row.serviceId} className="border-t border-border">
                    <td className="px-5 py-3 text-text-tertiary font-mono text-xs">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-text-primary">{row.serviceName}</td>
                    <td className="px-5 py-3 text-text-secondary">{row.categoryName}</td>
                    <td className="px-5 py-3 font-semibold text-text-primary">{row.sessionCount}</td>
                    <td className="px-5 py-3 font-semibold text-primary">
                      {formatCurrencyCompact(row.revenuePesewas)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-cream-dark">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-tertiary">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Expense breakdown */}
      {expenseBreakdown.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-text-primary">
              Expenses by category
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExpenseBreakdown}
              leftIcon={<Download size={12} />}
            >
              Export CSV
            </Button>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-cream">
                {['Category', 'Transactions', 'Total', 'Share'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenseBreakdown.map((row) => (
                <tr key={row.category} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {row.category}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {row.count}
                  </td>
                  <td className="px-5 py-3 font-semibold text-red-600">
                    {formatCurrencyCompact(row.totalPesewas)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-cream-dark">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-tertiary">
                        {row.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff performance */}
      <div className="mb-6 rounded-lg border border-border bg-white">
        <SectionHeader title="Staff performance" onExport={handleExportStaff} />
        {staffPerformance.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-tertiary">No staff data for this period</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-cream">
                {['Staff', 'Transactions', 'Revenue', 'Top service'].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffPerformance.map((row) => (
                <tr key={row.staffId} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-pale text-sm font-bold text-primary">
                        {row.staffName[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-text-primary">{row.staffName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-text-primary">
                    {row.transactionCount}
                  </td>
                  <td className="px-5 py-3 font-semibold text-primary">
                    {formatCurrencyCompact(row.revenuePesewas)}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {row.topService ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top customers */}
      <div className="rounded-lg border border-border bg-white">
        <SectionHeader title="Top customers" onExport={handleExportCustomers} />
        {topCustomers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-tertiary">No customer data for this period</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-cream">
                {['#', 'Customer', 'Visits', 'Total spend', 'Loyalty points'].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((row, i) => (
                <tr key={row.customerId} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs text-text-tertiary">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-pale text-sm font-bold text-primary">
                        {row.customerName[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-text-primary">{row.customerName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-text-primary">{row.visitCount}</td>
                  <td className="px-5 py-3 font-semibold text-primary">
                    {formatCurrencyCompact(row.totalSpendPesewas)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                      {row.loyaltyPoints} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Day Closures */}
      <div className="mt-6 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-text-tertiary" />
            <h2 className="text-sm font-semibold text-text-primary">
              Day closures
            </h2>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {closures.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportClosures}
            leftIcon={<Download size={12} />}
            disabled={closures.length === 0}
          >
            Export CSV
          </Button>
        </div>

        {isLoadingClosures ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : closures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-text-primary">
              No closures in this period
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Close the day from the dashboard to create a record.
            </p>
          </div>
        ) : (
          <>
            {(() => {
              const totalDiscrepancy = closures.reduce(
                (s, c) => s + c.discrepancyPesewas,
                0,
              );
              const shortages = closures.filter(
                (c) => c.discrepancyPesewas < 0,
              ).length;
              const surpluses = closures.filter(
                (c) => c.discrepancyPesewas > 0,
              ).length;
              const exact = closures.filter(
                (c) => c.discrepancyPesewas === 0,
              ).length;
              return (
                <div className="flex gap-4 border-b border-border bg-cream px-6 py-3">
                  <div className="text-xs text-text-secondary">
                    <span className="font-semibold text-green-700">{exact}</span> exact
                  </div>
                  <div className="text-xs text-text-secondary">
                    <span className="font-semibold text-blue-700">{surpluses}</span> surplus
                  </div>
                  <div className="text-xs text-text-secondary">
                    <span className="font-semibold text-red-700">{shortages}</span> shortage
                  </div>
                  <div className="ml-auto text-xs text-text-secondary">
                    Net discrepancy:{' '}
                    <span
                      className={cn(
                        'font-semibold',
                        totalDiscrepancy === 0
                          ? 'text-green-700'
                          : totalDiscrepancy > 0
                            ? 'text-blue-700'
                            : 'text-red-700',
                      )}
                    >
                      {totalDiscrepancy > 0 ? '+' : ''}
                      {formatCurrencyCompact(totalDiscrepancy)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-cream">
                    {[
                      'Date', 'Closed at', 'Closed by',
                      'Expected', 'Actual', 'Discrepancy', 'Note',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closures.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-5 py-3 text-sm font-medium text-text-primary">
                        {c.closeDate}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-secondary whitespace-nowrap">
                        {formatDateTime(c.closedAt)}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-secondary">
                        {c.closedByName || c.closedBy}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-primary">
                        {formatCurrencyCompact(c.expectedCashPesewas)}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-primary">
                        {formatCurrencyCompact(c.actualCashPesewas)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            c.discrepancyPesewas === 0
                              ? 'bg-green-50 text-green-700'
                              : c.discrepancyPesewas > 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-red-50 text-red-700',
                          )}
                        >
                          {c.discrepancyPesewas > 0 ? '+' : ''}
                          {formatCurrencyCompact(c.discrepancyPesewas)}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate px-5 py-3 text-sm text-text-secondary">
                        {c.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
