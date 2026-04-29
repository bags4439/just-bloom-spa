import React, { useState, useCallback, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { exportCsv } from '@/shared/utils/exportCsv';
import { getDateRanges } from '@/shared/utils/dateRanges';
import { cn } from '@/shared/utils/cn';
import { useReport } from '../hooks/useReport';
import type { DateRange } from '../types/report.types';

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
  const [dateRange, setDateRange] = useState<DateRange>(ranges.today!);
  const { state } = useReport(dateRange);

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

  const chartData = useMemo(() => {
    if (state.status !== 'success') return [];
    return state.data.dailyRevenue.map((d) => ({
      name: d.dayLabel,
      revenue: d.revenuePesewas / 100,
    }));
  }, [state]);

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

  const { revenue, servicePopularity, staffPerformance, topCustomers } = state.data;

  return (
    <div className="p-9 max-w-[1200px]">
      <PageHeader
        title="Reports"
        subtitle={`${dateRange.label} · ${dateRange.from === dateRange.to ? dateRange.from : `${dateRange.from} to ${dateRange.to}`}`}
        action={<DateRangePicker value={dateRange} onChange={setDateRange} />}
      />

      {/* Summary cards */}
      <div className="mb-6 flex gap-4">
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
      </div>

      {/* Revenue chart + channel breakdown */}
      <div className="mb-6 flex gap-5">
        <div className="flex-[3] rounded-lg border border-border bg-white px-6 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Daily revenue</p>
              <p className="mt-0.5 text-xs text-text-tertiary">GHS — selected period</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportRevenue} leftIcon={<Download size={12} />}>
              Export CSV
            </Button>
          </div>
          {chartData.length === 0 || chartData.every((d) => d.revenue === 0) ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-text-tertiary">No revenue data for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={chartData.length > 14 ? 6 : 18}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#8A9E90' }}
                  axisLine={false}
                  tickLine={false}
                  interval={chartData.length > 14 ? Math.floor(chartData.length / 7) : 0}
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
    </div>
  );
};

export default ReportsPage;
