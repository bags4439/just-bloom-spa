import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, TrendingUp, Star, Receipt } from 'lucide-react';

import { ROUTES } from '@/config/routes';
import { Button } from '@/shared/components/ui/Button';
import { Badge, type BadgeVariant } from '@/shared/components/ui/Badge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatDate, formatDateTime } from '@/shared/utils/formatDate';
import { useServices } from '@/core/ServiceContainerContext';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type { CustomerWithStats, Customer } from '../types';
import type { TransactionSummary } from '@/features/transactions/types';
import { TransactionStatus, PaymentChannel } from '@/features/transactions/types';
import { CustomerModal } from './CustomerModal';

const CHANNEL_VARIANT: Record<string, BadgeVariant> = {
  [PaymentChannel.CASH]: 'cash',
  [PaymentChannel.MOMO]: 'momo',
  [PaymentChannel.BANK]: 'bank',
  [PaymentChannel.SPLIT]: 'split',
};

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(
  ({ label, value, icon: Icon, iconColor }) => (
    <div className="flex-1 rounded-lg border border-border bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {label}
          </p>
          <p className="text-xl font-bold text-text-primary">{value}</p>
        </div>
        <div
          className="rounded-lg p-2"
          style={{ background: iconColor + '18' }}
        >
          <Icon size={16} color={iconColor} />
        </div>
      </div>
    </div>
  ),
);
StatCard.displayName = 'StatCard';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customerService, transactionQueryRepo } = useServices();
  const addToast = useUiStore((s) => s.addToast);

  const [customer, setCustomer] = useState<CustomerWithStats | null>(null);
  const [visits, setVisits] = useState<TransactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [cust, txns] = await Promise.all([
        customerService.getById(id),
        transactionQueryRepo.getByCustomerId(id, 20),
      ]);
      if (!cust) {
        navigate(ROUTES.CUSTOMERS, { replace: true });
        return;
      }
      setCustomer(cust);
      setVisits(txns);
    } catch (err) {
      addToast({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Failed to load customer',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, customerService, transactionQueryRepo, navigate, addToast]);

  useEffect(() => { void load(); }, [load]);

  const handleEditSuccess = useCallback(
    (_updated: Customer): void => {
      void load();
      setIsEditOpen(false);
    },
    [load],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="p-9 max-w-[900px]">
      {/* Back + header */}
      <button
        onClick={() => navigate(ROUTES.CUSTOMERS)}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light transition-colors"
      >
        <ArrowLeft size={15} />
        All customers
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-pale text-2xl font-bold text-primary">
            {customer.name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{customer.name}</h1>
            <p className="text-sm text-text-secondary">{customer.phone}</p>
            {customer.email && (
              <p className="text-sm text-text-secondary">{customer.email}</p>
            )}
            <p className="mt-1 text-xs text-text-tertiary">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsEditOpen(true)}
          leftIcon={<Pencil size={14} />}
        >
          Edit
        </Button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 flex gap-4">
        <StatCard
          label="Total visits"
          value={String(customer.visitCount)}
          icon={Receipt}
          iconColor="#1D4D35"
        />
        <StatCard
          label="Total spend"
          value={formatCurrencyCompact(customer.totalSpendPesewas)}
          icon={TrendingUp}
          iconColor="#C4962A"
        />
        <StatCard
          label="Loyalty points"
          value={`${customer.loyaltyPoints} pts`}
          icon={Star}
          iconColor="#7C3AED"
        />
        <div className="flex-1 rounded-lg border border-border bg-white p-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Last visit
          </p>
          <p className="text-base font-bold text-text-primary">
            {customer.lastVisitTs ? formatDate(customer.lastVisitTs) : 'No visits yet'}
          </p>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="mb-6 rounded-lg border border-border bg-white p-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Notes
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{customer.notes}</p>
        </div>
      )}

      {/* Visit history */}
      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Visit history
          </h2>
        </div>
        {visits.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-tertiary">No visits recorded yet</p>
          </div>
        ) : (
          visits.map((t) => (
            <div
              key={t.id}
              className={cn(
                'flex items-start justify-between border-b border-border px-5 py-4 last:border-0',
                t.status === TransactionStatus.VOIDED && 'opacity-45',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {t.serviceNames.join(', ') || 'No services'}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">
                    {formatDateTime(t.timestamp)}
                  </span>
                  <span className="text-xs text-text-tertiary">·</span>
                  <span className="text-xs text-text-tertiary">{t.staffName}</span>
                  {t.status === TransactionStatus.VOIDED && (
                    <Badge variant="danger">voided</Badge>
                  )}
                </div>
              </div>
              <div className="ml-4 flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold text-primary">
                  {formatCurrencyCompact(t.netPesewas)}
                </span>
                <Badge variant={CHANNEL_VARIANT[t.primaryChannel] ?? 'neutral'}>
                  {t.primaryChannel.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      <CustomerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
        existing={customer}
      />
    </div>
  );
};

export default CustomerDetailPage;
