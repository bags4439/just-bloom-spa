import React from 'react';

import { Badge, type BadgeVariant } from '@/shared/components/ui/Badge';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatTime } from '@/shared/utils/formatDate';
import { PaymentChannel, TransactionStatus } from '@/features/transactions/types';
import type { TransactionSummary } from '@/features/transactions/types';

const channelVariant: Record<string, BadgeVariant> = {
  [PaymentChannel.CASH]: 'cash',
  [PaymentChannel.MOMO]: 'momo',
  [PaymentChannel.BANK]: 'bank',
  [PaymentChannel.SPLIT]: 'split',
};

interface Props {
  readonly transactions: TransactionSummary[];
  readonly onViewAll: () => void;
}

export const RecentTransactionsTable: React.FC<Props> = React.memo(
  ({ transactions, onViewAll }) => (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Recent transactions
        </h2>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-primary hover:text-primary-light transition-colors"
        >
          View all
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-text-tertiary">
          No transactions recorded yet today
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-cream">
                {['ID', 'Time', 'Customer', 'Services', 'Amount', 'Channel', 'Staff'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-border"
                  style={{ opacity: t.status === TransactionStatus.VOIDED ? 0.45 : 1 }}
                >
                  <td className="px-5 py-3 font-mono text-[11px] text-text-tertiary">
                    {t.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {formatTime(t.timestamp)}
                    {t.isTimestampManual && (
                      <span className="ml-1 text-[10px] text-accent" title="Time was manually set">
                        ✎
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {t.customerName}
                  </td>
                  <td className="max-w-[180px] truncate px-5 py-3 text-text-secondary">
                    {t.serviceNames.join(', ')}
                  </td>
                  <td className="px-5 py-3 font-semibold text-primary">
                    {formatCurrencyCompact(t.netPesewas)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={channelVariant[t.primaryChannel] ?? 'neutral'}>
                      {t.primaryChannel.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{t.staffName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  ),
);
RecentTransactionsTable.displayName = 'RecentTransactionsTable';
