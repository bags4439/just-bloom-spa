import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Search, X, ChevronRight, Printer, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Badge, type BadgeVariant } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import type { ReceiptData } from '@/shared/components/layout/Receipt';
import { usePrint } from '@/shared/hooks/usePrintReceipt';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatDateTime, formatTime } from '@/shared/utils/formatDate';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type {
  TransactionSummary,
  TransactionDetail,
  TransactionFilters,
  ExpenseSummary,
  OtherIncomeSummary,
} from '../types';
import { PaymentChannel, TransactionStatus } from '../types';
import { CashFlowEditModal } from './CashFlowEditModal';

// ─── Constants ────────────────────────────────────────────────────────────────

type ActiveTab = 'sales' | 'expenses' | 'other_income';

const CHANNEL_VARIANT: Record<string, BadgeVariant> = {
  [PaymentChannel.CASH]: 'cash',
  [PaymentChannel.MOMO]: 'momo',
  [PaymentChannel.BANK]: 'bank',
  [PaymentChannel.SPLIT]: 'split',
};

const DATE_RANGE_LABELS = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
} as const;

type DateRange = keyof typeof DATE_RANGE_LABELS;

// ─── Void modal ───────────────────────────────────────────────────────────────

const voidSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});
type VoidFormData = z.infer<typeof voidSchema>;

interface VoidModalProps {
  isOpen: boolean;
  transactionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VoidModal: React.FC<VoidModalProps> = ({
  isOpen, transactionId, onClose, onSuccess,
}) => {
  const { transactionService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    setError, reset,
  } = useForm<VoidFormData>({ resolver: zodResolver(voidSchema) });

  const handleClose = useCallback((): void => { reset(); onClose(); }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: VoidFormData): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        await transactionService.voidTransaction(transactionId, data.reason, user, sessionId);
        addToast({ variant: 'success', message: 'Transaction voided successfully' });
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to void transaction',
        });
      }
    },
    [transactionService, transactionId, user, sessionId, addToast, handleClose, onSuccess, setError],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Void transaction"
      description="This action cannot be undone." size="sm">
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Reason (required)
          </label>
          <textarea rows={3} autoFocus
            placeholder="Explain why this transaction is being voided..."
            className="w-full resize-none rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('reason')}
          />
          {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
        </div>
        {errors.root && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1 justify-center">Cancel</Button>
          <Button type="submit" variant="danger" isLoading={isSubmitting} className="flex-1 justify-center">Void transaction</Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Transaction detail modal ─────────────────────────────────────────────────

interface DetailModalProps {
  detail: TransactionDetail;
  onClose: () => void;
  onVoid: (id: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ detail, onClose, onVoid }) => {
  const user = useAuthStore(selectUser);
  const receiptConfig = useUiStore((s) => s.receiptConfig);
  const isVoided = detail.status === TransactionStatus.VOIDED;
  const { print } = usePrint();
  const [isPrinting, setIsPrinting] = useState(false);

  const handleVoidClick = useCallback((): void => {
    onClose();
    onVoid(detail.id);
  }, [onClose, onVoid, detail.id]);

  const isWithinVoidWindow = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- void window must compare to wall clock when detail is shown
    const ageMs = Date.now() - new Date(detail.timestamp).getTime();
    return ageMs <= 5 * 60 * 1000;
  }, [detail.timestamp]);

  const staffCanVoid =
    user?.role === 'staff' &&
    detail.staffName === user.name &&
    isWithinVoidWindow;
  const managerCanVoid =
    user?.role === 'manager' || user?.role === 'owner';
  const showVoidButton = !isVoided && (staffCanVoid || managerCanVoid);

  const receiptData: ReceiptData | null = !isVoided
      ? {
          transactionId: detail.id,
          timestamp: detail.timestamp,
          customerName:
            detail.customerName === 'Walk-in' ? null : detail.customerName,
          staffName: detail.staffName,
          serviceNames: detail.serviceNames,
          grossPesewas: detail.grossPesewas,
          discountPesewas: detail.discountPesewas,
          netPesewas: detail.netPesewas,
          amountPaidPesewas: detail.amountPaidPesewas,
          changePesewas: detail.changePesewas,
          primaryChannel: detail.payments[0]?.channel ?? detail.primaryChannel,
          loyaltyPointsAwarded: 0,
          spaName: receiptConfig.spaName,
          tagline: receiptConfig.tagline,
          address: receiptConfig.address,
          phone: receiptConfig.phone,
        }
      : null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Transaction ${detail.id.slice(0, 8).toUpperCase()}`}
      description={formatDateTime(detail.timestamp)}
      size="md"
    >
      <div className="flex flex-col gap-4">
        {isVoided && (
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">Voided</p>
            {detail.voidReason && (
              <p className="mt-1 text-xs text-red-600">
                Reason: {detail.voidReason}
              </p>
            )}
            {detail.voidedByName && (
              <p className="text-xs text-red-500">By: {detail.voidedByName}</p>
            )}
          </div>
        )}

        <div className="rounded-lg bg-cream p-4 text-sm">
          <div className="mb-2 flex justify-between">
            <span className="text-text-secondary">Customer</span>
            <span className="font-medium text-text-primary">
              {detail.customerName}
            </span>
          </div>
          <div className="mb-2 flex justify-between">
            <span className="text-text-secondary">Staff</span>
            <span className="font-medium text-text-primary">
              {detail.staffName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Recorded</span>
            <span className="font-medium text-text-primary">
              {formatDateTime(detail.createdAt)}
              {detail.isTimestampManual && (
                <span className="ml-1 text-xs text-accent">✎</span>
              )}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Services
          </p>
          {detail.serviceNames.map((n) => (
            <div
              key={n}
              className="flex justify-between border-b border-border py-2 text-sm"
            >
              <span className="text-text-primary">{n}</span>
            </div>
          ))}
          {detail.discountPesewas > 0 && (
            <div className="mt-1 flex justify-between text-sm text-text-secondary">
              <span>Discount</span>
              <span>− {formatCurrencyCompact(detail.discountPesewas)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between font-bold">
            <span className="text-text-primary">Total</span>
            <span className="text-primary">
              {formatCurrencyCompact(detail.netPesewas)}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Payments
          </p>
          {detail.payments.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge variant={CHANNEL_VARIANT[p.channel] ?? 'neutral'}>
                  {p.channel.toUpperCase()}
                </Badge>
                {p.referenceNo && (
                  <span className="font-mono text-xs text-text-tertiary">
                    {p.referenceNo}
                  </span>
                )}
              </div>
              <span className="font-medium">
                {formatCurrencyCompact(p.amountPesewas)}
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-between text-sm text-text-secondary">
            <span>Change given</span>
            <span>{formatCurrencyCompact(detail.changePesewas)}</span>
          </div>
        </div>

        {detail.notes && (
          <div className="rounded-lg bg-cream px-4 py-3 text-sm text-text-secondary">
            <span className="font-medium">Notes: </span>
            {detail.notes}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 justify-center"
          >
            Close
          </Button>
          {!isVoided && receiptData && (
            <Button
              variant="outline"
              onClick={() => {
                if (!receiptData) return;
                setIsPrinting(true);
                print(receiptData);
                setTimeout(() => setIsPrinting(false), 1500);
              }}
              leftIcon={isPrinting ? undefined : <Printer size={14} />}
              isLoading={isPrinting}
              disabled={isPrinting}
              className="flex-1 justify-center"
            >
              {isPrinting ? 'Preparing...' : 'Print receipt'}
            </Button>
          )}
          {showVoidButton && (
            <Button
              variant="danger"
              onClick={handleVoidClick}
              className="flex-1 justify-center"
            >
              Void
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─── Search + date filter bar ─────────────────────────────────────────────────

interface FilterBarProps {
  search: string;
  dateRange: DateRange;
  onSearchChange: (s: string) => void;
  onDateRangeChange: (d: DateRange) => void;
  extraFilters?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = React.memo(({
  search, dateRange, onSearchChange, onDateRangeChange, extraFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string): void => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(value), 300);
  }, [onSearchChange]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white px-4 py-3">
      <div className="relative flex-1" style={{ minWidth: 200 }}>
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input value={localSearch} onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search..."
          className="w-full rounded-md border border-border bg-cream py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {localSearch && (
          <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
            <X size={13} />
          </button>
        )}
      </div>
      <div className="flex gap-1">
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
          <button key={range} onClick={() => onDateRangeChange(range)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              dateRange === range
                ? 'border-primary bg-primary-pale text-primary'
                : 'border-border bg-white text-text-secondary hover:bg-cream',
            )}
          >
            {DATE_RANGE_LABELS[range]}
          </button>
        ))}
      </div>
      {extraFilters}
    </div>
  );
});
FilterBar.displayName = 'FilterBar';

// ─── Sales tab ────────────────────────────────────────────────────────────────

interface SalesTabProps {
  onVoidSuccess: () => void;
}

const SalesTab: React.FC<SalesTabProps> = ({ onVoidSuccess }) => {
  const { transactionQueryRepo } = useServices();
  const addToast = useUiStore((s) => s.addToast);
  const triggerRefresh = useUiStore((s) => s.triggerDashboardRefresh);

  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({
    dateRange: 'today', channel: null, status: 'all', search: '',
  });
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [voidId, setVoidId] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const rows = await transactionQueryRepo.getAll(filters);
      setTransactions(rows);
    } catch (err) {
      addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    } finally {
      setIsLoading(false);
    }
  }, [transactionQueryRepo, filters, addToast]);

  useEffect(() => { void load(); }, [load]);

  const handleRowClick = useCallback(async (id: string): Promise<void> => {
    setIsLoadingDetail(true);
    try {
      const d = await transactionQueryRepo.getById(id);
      setDetail(d);
    } finally {
      setIsLoadingDetail(false);
    }
  }, [transactionQueryRepo]);

  const handleVoidSuccess = useCallback((): void => {
    void load();
    triggerRefresh();
    setVoidId(null);
    onVoidSuccess();
  }, [load, triggerRefresh, onVoidSuccess]);

  const totalRevenue = useMemo(
    () => transactions.filter((t) => t.status === TransactionStatus.COMPLETE).reduce((s, t) => s + t.netPesewas, 0),
    [transactions],
  );

  return (
    <>
      <FilterBar
        search={filters.search}
        dateRange={filters.dateRange as DateRange}
        onSearchChange={(s) => setFilters((p) => ({ ...p, search: s }))}
        onDateRangeChange={(d) => setFilters((p) => ({ ...p, dateRange: d }))}
        extraFilters={
          <div className="flex gap-1">
            {(['all', 'cash', 'momo', 'bank', 'split'] as const).map((ch) => (
              <button key={ch} onClick={() => setFilters((p) => ({ ...p, channel: ch === 'all' ? null : ch }))}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold uppercase transition-colors',
                  (ch === 'all' ? filters.channel === null : filters.channel === ch)
                    ? 'border-primary bg-primary-pale text-primary'
                    : 'border-border bg-white text-text-secondary hover:bg-cream',
                )}
              >{ch}</button>
            ))}
          </div>
        }
      />
      <div className="mt-4 text-xs text-text-tertiary mb-2">
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · {formatCurrencyCompact(totalRevenue)} revenue
      </div>
      <div className="rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="md" /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-text-primary">No sales found</p>
            <p className="mt-1 text-sm text-text-secondary">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-cream">
                  {['ID', 'Time', 'Customer', 'Services', 'Amount', 'Channel', 'Staff', 'Status', ''].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} onClick={() => void handleRowClick(t.id)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-cream"
                    style={{ opacity: t.status === TransactionStatus.VOIDED ? 0.45 : 1 }}
                  >
                    <td className="px-5 py-3 font-mono text-[11px] text-text-tertiary">{t.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3 text-text-primary">
                      {formatTime(t.timestamp)}
                      {t.isTimestampManual && <span className="ml-1 text-[10px] text-accent">✎</span>}
                    </td>
                    <td className="px-5 py-3 font-medium text-text-primary">{t.customerName}</td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-text-secondary">{t.serviceNames.join(', ')}</td>
                    <td className="px-5 py-3 font-semibold text-primary">{formatCurrencyCompact(t.netPesewas)}</td>
                    <td className="px-5 py-3"><Badge variant={CHANNEL_VARIANT[t.primaryChannel] ?? 'neutral'}>{t.primaryChannel.toUpperCase()}</Badge></td>
                    <td className="px-5 py-3 text-text-secondary">{t.staffName}</td>
                    <td className="px-5 py-3"><Badge variant={t.status === TransactionStatus.VOIDED ? 'danger' : 'success'}>{t.status}</Badge></td>
                    <td className="px-5 py-3 text-text-tertiary"><ChevronRight size={15} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isLoadingDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/10">
          <Spinner size="lg" />
        </div>
      )}
      {detail && !isLoadingDetail && (
        <DetailModal detail={detail} onClose={() => setDetail(null)} onVoid={(id) => setVoidId(id)} />
      )}
      {voidId && (
        <VoidModal isOpen={true} transactionId={voidId} onClose={() => setVoidId(null)} onSuccess={handleVoidSuccess} />
      )}
    </>
  );
};

// ─── Expenses tab ─────────────────────────────────────────────────────────────

const ExpensesTab: React.FC = () => {
  const { expenseQueryRepo } = useServices();
  const addToast = useUiStore((s) => s.addToast);
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [search, setSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<ExpenseSummary | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const rows = await expenseQueryRepo.getAll(dateRange);
      setExpenses(rows);
    } catch (err) {
      addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    } finally {
      setIsLoading(false);
    }
  }, [expenseQueryRepo, dateRange, addToast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => search.trim()
      ? expenses.filter((e) =>
          e.category.toLowerCase().includes(search.toLowerCase()) ||
          e.staffName.toLowerCase().includes(search.toLowerCase()),
        )
      : expenses,
    [expenses, search],
  );

  const total = useMemo(
    () => filtered.reduce((s, e) => s + e.amountPesewas, 0),
    [filtered],
  );

  const handleExpenseRowEditClick = useCallback(
    (entry: ExpenseSummary) => (): void => {
      setEditingEntry(entry);
    },
    [],
  );

  return (
    <>
      <FilterBar
        search={search}
        dateRange={dateRange}
        onSearchChange={setSearch}
        onDateRangeChange={setDateRange}
      />
      <div className="mt-4 text-xs text-text-tertiary mb-2">
        {filtered.length} expense{filtered.length !== 1 ? 's' : ''} · {formatCurrencyCompact(total)} outflow
      </div>
      <div className="rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="md" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-text-primary">No expenses found</p>
            <p className="mt-1 text-sm text-text-secondary">Record an expense from the New Transaction screen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-cream">
                  {['Time', 'Category', 'Amount', 'Channel', 'Reference', 'Staff', 'Notes', ''].map((h) => (
                    <th key={h === '' ? 'actions' : h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-5 py-3 text-text-primary">{formatTime(e.timestamp)}</td>
                    <td className="px-5 py-3 font-medium text-text-primary">{e.category}</td>
                    <td className="px-5 py-3 font-semibold text-red-600">{formatCurrencyCompact(e.amountPesewas)}</td>
                    <td className="px-5 py-3"><Badge variant={CHANNEL_VARIANT[e.paymentChannel] ?? 'neutral'}>{e.paymentChannel.toUpperCase()}</Badge></td>
                    <td className="px-5 py-3 font-mono text-xs text-text-tertiary">{e.referenceNo ?? '—'}</td>
                    <td className="px-5 py-3 text-text-secondary">{e.staffName}</td>
                    <td className="max-w-[160px] truncate px-5 py-3 text-text-secondary">{e.notes ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExpenseRowEditClick(e)}
                        leftIcon={<Pencil size={12} />}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingEntry && (
        <CashFlowEditModal
          isOpen={true}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => {
            void load();
            setEditingEntry(null);
          }}
          entry={editingEntry}
          type="expense"
        />
      )}
    </>
  );
};

// ─── Other Income tab ─────────────────────────────────────────────────────────

const OtherIncomeTab: React.FC = () => {
  const { otherIncomeRepo } = useServices();
  const addToast = useUiStore((s) => s.addToast);
  const [entries, setEntries] = useState<OtherIncomeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [search, setSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<OtherIncomeSummary | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const rows = await otherIncomeRepo.getAll(dateRange);
      setEntries(rows);
    } catch (err) {
      addToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to load' });
    } finally {
      setIsLoading(false);
    }
  }, [otherIncomeRepo, dateRange, addToast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => search.trim()
      ? entries.filter((e) =>
          e.category.toLowerCase().includes(search.toLowerCase()) ||
          e.staffName.toLowerCase().includes(search.toLowerCase()),
        )
      : entries,
    [entries, search],
  );

  const total = useMemo(
    () => filtered.reduce((s, e) => s + e.amountPesewas, 0),
    [filtered],
  );

  const handleOtherIncomeRowEditClick = useCallback(
    (entry: OtherIncomeSummary) => (): void => {
      setEditingEntry(entry);
    },
    [],
  );

  return (
    <>
      <FilterBar
        search={search}
        dateRange={dateRange}
        onSearchChange={setSearch}
        onDateRangeChange={setDateRange}
      />
      <div className="mt-4 text-xs text-text-tertiary mb-2">
        {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'} · {formatCurrencyCompact(total)} inflow
      </div>
      <div className="rounded-lg border border-border bg-white">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="md" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-text-primary">No other income recorded</p>
            <p className="mt-1 text-sm text-text-secondary">Record other income from the New Transaction screen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-cream">
                  {['Time', 'Category', 'Amount', 'Channel', 'Reference', 'Staff', 'Notes', ''].map((h) => (
                    <th key={h === '' ? 'actions' : h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-5 py-3 text-text-primary">{formatTime(e.timestamp)}</td>
                    <td className="px-5 py-3 font-medium text-text-primary">{e.category}</td>
                    <td className="px-5 py-3 font-semibold text-green-600">{formatCurrencyCompact(e.amountPesewas)}</td>
                    <td className="px-5 py-3"><Badge variant={CHANNEL_VARIANT[e.paymentChannel] ?? 'neutral'}>{e.paymentChannel.toUpperCase()}</Badge></td>
                    <td className="px-5 py-3 font-mono text-xs text-text-tertiary">{e.referenceNo ?? '—'}</td>
                    <td className="px-5 py-3 text-text-secondary">{e.staffName}</td>
                    <td className="max-w-[160px] truncate px-5 py-3 text-text-secondary">{e.notes ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOtherIncomeRowEditClick(e)}
                        leftIcon={<Pencil size={12} />}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editingEntry && (
        <CashFlowEditModal
          isOpen={true}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => {
            void load();
            setEditingEntry(null);
          }}
          entry={editingEntry}
          type="other_income"
        />
      )}
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const TransactionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sales');
  const [voidRefreshKey, setVoidRefreshKey] = useState(0);

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'sales', label: 'Sales' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'other_income', label: 'Other income' },
  ];

  return (
    <div className="p-9">
      <PageHeader title="Transactions" subtitle="Sales, expenses, and other income" />

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && (
        <SalesTab onVoidSuccess={() => setVoidRefreshKey((k) => k + 1)} key={voidRefreshKey} />
      )}
      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'other_income' && <OtherIncomeTab />}
    </div>
  );
};

export default TransactionsPage;
