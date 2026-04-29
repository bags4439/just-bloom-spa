import type { DateRange } from '@/features/reports/types/report.types';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getDateRanges(): Record<string, DateRange> {
  const today = new Date();
  const todayStr = toDateStr(today);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 29);

  return {
    today: { from: todayStr, to: todayStr, label: 'Today' },
    thisWeek: {
      from: toDateStr(weekStart),
      to: todayStr,
      label: 'This week',
    },
    thisMonth: {
      from: toDateStr(monthStart),
      to: todayStr,
      label: 'This month',
    },
    last30: {
      from: toDateStr(last30Start),
      to: todayStr,
      label: 'Last 30 days',
    },
  };
}

export function formatDateRangeDisplay(range: DateRange): string {
  if (range.from === range.to) return range.label;
  return `${range.from} → ${range.to}`;
}
