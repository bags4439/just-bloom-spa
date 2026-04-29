import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Search, Printer } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { ROUTES } from '@/config/routes';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Spinner } from '@/shared/components/ui/Spinner';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type { SpaService, SpaServiceCategory } from '@/features/spa-services/types';
import type { Customer } from '@/features/customers/types';
import type { RecordedTransaction } from '../services/TransactionService';

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowType = 'sale' | 'expense' | 'other_income';
type SaleStep = 1 | 2 | 3;

const EXPENSE_CATEGORIES = [
  'Supplies', 'Utilities', 'Staff welfare', 'Maintenance',
  'Marketing', 'Transport', 'Other',
];

const OTHER_INCOME_CATEGORIES = [
  'Capital injection', 'Supplier refund', 'Equipment sale',
  'Loan received', 'Interest', 'Miscellaneous',
];

// ─── Flow type toggle ─────────────────────────────────────────────────────────

interface FlowToggleProps {
  value: FlowType;
  onChange: (t: FlowType) => void;
}

const FlowToggle: React.FC<FlowToggleProps> = ({ value, onChange }) => {
  const options: Array<{ type: FlowType; label: string }> = [
    { type: 'sale', label: '💆 Sale' },
    { type: 'expense', label: '💸 Expense' },
    { type: 'other_income', label: '💰 Other income' },
  ];
  return (
    <div className="mb-5 flex gap-2">
      {options.map((o) => (
        <button
          key={o.type}
          onClick={() => onChange(o.type)}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
            value === o.type
              ? 'border-primary bg-primary-pale text-primary'
              : 'border-border bg-white text-text-secondary hover:bg-cream',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ current: SaleStep }> = ({ current }) => {
  const steps = ['Customer', 'Services', 'Payment'];
  return (
    <div className="mb-7 flex items-center gap-0">
      {steps.map((label, i) => {
        const n = (i + 1) as SaleStep;
        const isDone = current > n;
        const isActive = current === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isDone || isActive
                    ? 'bg-primary text-white'
                    : 'bg-border text-text-tertiary',
                )}
              >
                {isDone ? <Check size={13} /> : n}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isActive ? 'font-semibold text-text-primary' : 'text-text-tertiary',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 h-px flex-1 bg-border" style={{ maxWidth: 40 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Shared simple cash flow form (Expense + Other Income) ────────────────────

const cashFlowSchema = z.object({
  category: z.string().min(1, 'Select a category'),
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    { message: 'Enter a valid amount greater than zero' },
  ),
  channel: z.enum(['cash', 'momo', 'bank']),
  referenceNo: z.string().optional(),
  notes: z.string().max(500).optional(),
});
type CashFlowFormData = z.infer<typeof cashFlowSchema>;

interface CashFlowFormProps {
  flowType: 'expense' | 'other_income';
  onSubmit: (data: CashFlowFormData) => Promise<void>;
  onFlowChange: (t: FlowType) => void;
  isSubmitting: boolean;
}

const CashFlowForm: React.FC<CashFlowFormProps> = ({
  flowType, onSubmit, onFlowChange, isSubmitting,
}) => {
  const categories =
    flowType === 'expense' ? EXPENSE_CATEGORIES : OTHER_INCOME_CATEGORIES;

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<CashFlowFormData>({
    resolver: zodResolver(cashFlowSchema),
    defaultValues: { channel: 'cash' },
  });

  const channel = watch('channel');

  return (
    <div className="max-w-lg">
      <FlowToggle value={flowType} onChange={onFlowChange} />
      <Card>
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Category
            </label>
            <select
              className="w-full rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('category')}
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
            )}
          </div>

          <Input
            label="Amount (GHS)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Payment channel
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['cash', 'momo', 'bank'] as const).map((ch) => (
                <label
                  key={ch}
                  className={cn(
                    'flex cursor-pointer items-center justify-center rounded-lg border py-2 text-xs font-semibold uppercase transition-colors',
                    channel === ch
                      ? 'border-primary bg-primary-pale text-primary'
                      : 'border-border bg-white text-text-secondary hover:bg-cream',
                  )}
                >
                  <input type="radio" value={ch} className="sr-only" {...register('channel')} />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          {(channel === 'momo' || channel === 'bank') && (
            <Input
              label="Reference No."
              placeholder="Enter reference number"
              {...register('referenceNo')}
            />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={
                flowType === 'expense'
                  ? 'What was this expense for?'
                  : 'Source or additional details...'
              }
              {...register('notes')}
            />
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
            {flowType === 'expense' ? 'Record expense' : 'Record other income'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

// ─── Step 1: Customer selection ───────────────────────────────────────────────

interface Step1Props {
  selectedCustomer: Customer | null;
  onSelectCustomer: (c: Customer | null) => void;
  onFlowChange: (t: FlowType) => void;
  onNext: () => void;
}

const Step1Customer: React.FC<Step1Props> = ({
  selectedCustomer, onSelectCustomer, onFlowChange, onNext,
}) => {
  const { customerRepo } = useServices();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const found = await customerRepo.search(query);
      setResults(found);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, customerRepo]);

  return (
    <div className="max-w-lg">
      <FlowToggle value="sale" onChange={onFlowChange} />
      <Card padding="none">
        <div className="border-b border-border p-5">
          <p className="mb-3 text-sm font-semibold text-text-primary">
            Select customer (optional)
          </p>
          <Input
            placeholder="Search by name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftElement={<Search size={14} />}
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {isSearching && (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => { onSelectCustomer(c); setQuery(''); setResults([]); }}
              className={cn(
                'flex w-full items-center justify-between border-b border-border px-5 py-3 text-left transition-colors last:border-0 hover:bg-cream',
                selectedCustomer?.id === c.id && 'bg-primary-pale',
              )}
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-tertiary">
                  {c.phone} · {c.loyaltyPoints} pts
                </p>
              </div>
              {selectedCustomer?.id === c.id && (
                <Check size={15} className="text-primary" />
              )}
            </button>
          ))}
          {!isSearching && query.length > 0 && results.length === 0 && (
            <p className="px-5 py-4 text-sm text-text-tertiary">No customers found</p>
          )}
        </div>
        <button
          onClick={() => onSelectCustomer(null)}
          className={cn(
            'flex w-full items-center justify-between border-t border-border px-5 py-3 transition-colors hover:bg-cream',
            selectedCustomer === null && 'bg-primary-pale',
          )}
        >
          <span className="text-sm font-medium text-text-secondary">
            Continue as walk-in
          </span>
          {selectedCustomer === null && (
            <Check size={15} className="text-primary" />
          )}
        </button>
      </Card>
      {selectedCustomer && (
        <div className="mt-3 rounded-lg bg-primary-pale px-4 py-3 text-sm">
          <span className="font-medium text-primary">Selected: </span>
          <span className="text-text-primary">{selectedCustomer.name}</span>
          <span className="ml-2 text-text-secondary">
            ({selectedCustomer.loyaltyPoints} pts)
          </span>
          <button
            onClick={() => onSelectCustomer(null)}
            className="ml-3 text-xs text-text-tertiary underline"
          >
            Remove
          </button>
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button onClick={onNext} rightIcon={<ChevronRight size={16} />}>
          Next
        </Button>
      </div>
    </div>
  );
};

// ─── Step 2: Service selection ────────────────────────────────────────────────

interface Step2Props {
  services: SpaService[];
  categories: SpaServiceCategory[];
  selected: SpaService[];
  onToggle: (s: SpaService) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2Services: React.FC<Step2Props> = ({
  services, categories, selected, onToggle, onNext, onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const gross = useMemo(
    () => selected.reduce((s, sv) => s + sv.pricePesewas, 0),
    [selected],
  );
  const filtered = useMemo(
    () => activeCategory === 'All'
      ? services
      : services.filter((s) => s.categoryName === activeCategory),
    [services, activeCategory],
  );

  if (services.length === 0) {
    return (
      <div className="max-w-lg">
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-text-primary">No services available</p>
            <p className="mt-1 text-sm text-text-secondary">
              Add services in Settings before recording a transaction.
            </p>
          </div>
        </Card>
        <div className="mt-4">
          <Button variant="outline" onClick={onBack} leftIcon={<ArrowLeft size={15} />}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-5">
      <div className="flex-1 min-w-0">
        <div className="mb-4 flex flex-wrap gap-2">
          {['All', ...categories.map((c) => c.name)].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                activeCategory === cat
                  ? 'border-primary bg-primary-pale text-primary'
                  : 'border-border bg-white text-text-secondary hover:bg-cream',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((s) => {
            const isSel = selected.some((x) => x.id === s.id);
            return (
              <button
                key={s.id}
                onClick={() => onToggle(s)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-all',
                  isSel
                    ? 'border-primary bg-primary-pale'
                    : 'border-border bg-white hover:border-primary/30 hover:bg-cream',
                )}
              >
                <p className="text-sm font-medium text-text-primary">{s.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">{s.categoryName}</span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrencyCompact(s.pricePesewas)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={onBack} leftIcon={<ArrowLeft size={15} />}>
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={selected.length === 0}
            rightIcon={<ChevronRight size={16} />}
          >
            Next
          </Button>
        </div>
      </div>
      <div className="w-52 shrink-0">
        <Card padding="sm" className="sticky top-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Selected
          </p>
          {selected.length === 0 ? (
            <p className="text-xs text-text-tertiary">No services selected</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selected.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-text-primary leading-tight">{s.name}</span>
                  <span className="shrink-0 text-xs font-bold text-text-primary">
                    {formatCurrencyCompact(s.pricePesewas)}
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-xs font-semibold text-text-primary">Total</span>
                <span className="text-base font-bold text-primary">
                  {formatCurrencyCompact(gross)}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ─── Step 3: Payment ──────────────────────────────────────────────────────────

const paymentSchema = z.object({
  channel: z.enum(['cash', 'momo', 'bank', 'split']),
  amountPaid: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
    { message: 'Enter a valid amount' },
  ),
  referenceNo: z.string().optional(),
  splitCashAmount: z.string().optional(),
  splitSecondChannel: z.enum(['momo', 'bank']).optional(),
  splitSecondAmount: z.string().optional(),
  splitSecondRef: z.string().optional(),
  customTimestamp: z.string().optional(),
  notes: z.string().max(500).optional(),
  discount: z.string().optional(),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

interface Step3Props {
  grossPesewas: number;
  customerName: string | null;
  serviceNames: string[];
  onBack: () => void;
  onComplete: (data: PaymentFormData) => Promise<void>;
  isSubmitting: boolean;
}

const Step3Payment: React.FC<Step3Props> = ({
  grossPesewas, customerName, serviceNames, onBack, onComplete, isSubmitting,
}) => {
  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { channel: 'cash' },
  });

  const channel = watch('channel');
  const discount = watch('discount');
  const amountPaid = watch('amountPaid');

  const discountPesewas = useMemo(
    () => Math.round((parseFloat(discount ?? '0') || 0) * 100),
    [discount],
  );
  const netPesewas = Math.max(0, grossPesewas - discountPesewas);
  const paidPesewas = Math.round((parseFloat(amountPaid ?? '0') || 0) * 100);
  const changePesewas = Math.max(0, paidPesewas - netPesewas);

  return (
    <div className="max-w-lg">
      <Card padding="none">
        <div className="border-b border-border p-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Order summary
          </p>
          {serviceNames.map((n) => (
            <div key={n} className="py-1 text-sm text-text-primary">{n}</div>
          ))}
          {customerName && (
            <p className="mt-2 text-xs text-text-secondary">Customer: {customerName}</p>
          )}
        </div>
        <form
          onSubmit={(e) => void handleSubmit(onComplete)(e)}
          className="flex flex-col gap-4 p-5"
          noValidate
        >
          <Input
            label="Discount (GHS)"
            type="number" step="0.01" min="0" placeholder="0.00"
            {...register('discount')}
          />
          <div className="flex items-center justify-between rounded-lg bg-cream px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Total due</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrencyCompact(netPesewas)}
            </span>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Payment channel
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['cash', 'momo', 'bank', 'split'] as const).map((ch) => (
                <label
                  key={ch}
                  className={cn(
                    'flex cursor-pointer items-center justify-center rounded-lg border py-2 text-xs font-semibold uppercase transition-colors',
                    channel === ch
                      ? 'border-primary bg-primary-pale text-primary'
                      : 'border-border bg-white text-text-secondary hover:bg-cream',
                  )}
                >
                  <input type="radio" value={ch} className="sr-only" {...register('channel')} />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          {(channel === 'momo' || channel === 'bank') && (
            <Input
              label={`${channel.toUpperCase()} Reference No.`}
              placeholder="Enter reference number"
              error={errors.referenceNo?.message}
              {...register('referenceNo')}
            />
          )}
          {channel === 'split' && (
            <div className="flex flex-col gap-3 rounded-lg bg-cream p-3">
              <Input label="Cash amount (GHS)" type="number" step="0.01" min="0" placeholder="0.00" {...register('splitCashAmount')} />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">Second channel</p>
                <div className="flex gap-2">
                  {(['momo', 'bank'] as const).map((ch) => (
                    <label
                      key={ch}
                      className={cn(
                        'flex flex-1 cursor-pointer items-center justify-center rounded-lg border py-1.5 text-xs font-semibold uppercase transition-colors',
                        watch('splitSecondChannel') === ch
                          ? 'border-primary bg-primary-pale text-primary'
                          : 'border-border bg-white text-text-secondary',
                      )}
                    >
                      <input type="radio" value={ch} className="sr-only" {...register('splitSecondChannel')} />
                      {ch}
                    </label>
                  ))}
                </div>
              </div>
              <Input label="Second amount (GHS)" type="number" step="0.01" min="0" placeholder="0.00" {...register('splitSecondAmount')} />
              <Input label="Reference No." placeholder="Enter reference number" {...register('splitSecondRef')} />
            </div>
          )}
          <Input
            label="Amount paid by customer (GHS)"
            type="number" step="0.01" min="0"
            placeholder={`${(netPesewas / 100).toFixed(2)}`}
            error={errors.amountPaid?.message}
            {...register('amountPaid')}
          />
          <div className="flex items-center justify-between rounded-lg bg-cream px-4 py-3">
            <span className="text-sm text-text-secondary">Change to give customer</span>
            <span className="text-lg font-bold text-text-primary">
              {formatCurrencyCompact(changePesewas)}
            </span>
          </div>
          <Input
            label="Override timestamp (optional)"
            type="datetime-local"
            hint="Leave blank to use current time"
            {...register('customTimestamp')}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any additional notes..."
              className="w-full resize-none rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('notes')}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onBack} leftIcon={<ArrowLeft size={15} />}>
              Back
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1 justify-center">
              Complete transaction
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// ─── Success screen ───────────────────────────────────────────────────────────

interface SuccessProps {
  result: RecordedTransaction;
  onDone: () => void;
}

const SuccessScreen: React.FC<SuccessProps> = ({ result, onDone }) => (
  <div className="max-w-md">
    <Card padding="none" className="overflow-hidden">
      <div className="bg-primary p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <Check size={26} className="text-white" />
        </div>
        <p className="text-lg font-bold text-white">Transaction complete</p>
        <p className="mt-1 text-sm text-white/60">
          {result.id.slice(0, 8).toUpperCase()} ·{' '}
          {new Date(result.timestamp).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
      <div className="p-6">
        {result.customerName && (
          <div className="mb-4 rounded-lg bg-primary-pale px-4 py-3">
            <p className="text-xs text-text-secondary">Customer</p>
            <p className="font-semibold text-text-primary">{result.customerName}</p>
            {result.loyaltyPointsAwarded > 0 && (
              <p className="mt-1 text-xs text-accent">
                +{result.loyaltyPointsAwarded} loyalty points earned
              </p>
            )}
          </div>
        )}
        {result.serviceNames.map((n) => (
          <div key={n} className="flex justify-between border-b border-border py-2 text-sm">
            <span className="text-text-primary">{n}</span>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold text-text-primary">Total</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrencyCompact(result.netPesewas)}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-text-secondary">
          <span>Change given</span>
          <span>{formatCurrencyCompact(result.changePesewas)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-text-secondary">
          <span>Payment</span>
          <Badge variant={result.primaryChannel as 'cash' | 'momo' | 'bank' | 'split'}>
            {result.primaryChannel.toUpperCase()}
          </Badge>
        </div>
        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            leftIcon={<Printer size={14} />}
            className="flex-1 justify-center"
          >
            Print receipt
          </Button>
          <Button onClick={onDone} className="flex-1 justify-center">
            Done
          </Button>
        </div>
      </div>
    </Card>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const NewTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const { transactionService, spaServiceRepo } = useServices();
  const triggerRefresh = useUiStore((s) => s.triggerDashboardRefresh);
  const addToast = useUiStore((s) => s.addToast);

  const [flowType, setFlowType] = useState<FlowType>('sale');
  const [step, setStep] = useState<SaleStep>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<SpaService[]>([]);
  const [services, setServices] = useState<SpaService[]>([]);
  const [categories, setCategories] = useState<SpaServiceCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RecordedTransaction | null>(null);

  useEffect(() => {
    void (async () => {
      const [svcs, cats] = await Promise.all([
        spaServiceRepo.findAllActive(),
        spaServiceRepo.findAllCategories(),
      ]);
      setServices(svcs);
      setCategories(cats);
    })();
  }, [spaServiceRepo]);

  const handleFlowChange = useCallback((t: FlowType) => {
    setFlowType(t);
    setSelectedServices([]);
    setSelectedCustomer(null);
    setStep(1);
  }, []);

  const handleToggleService = useCallback((s: SpaService) => {
    setSelectedServices((prev) =>
      prev.some((x) => x.id === s.id)
        ? prev.filter((x) => x.id !== s.id)
        : [...prev, s],
    );
  }, []);

  const grossPesewas = useMemo(
    () => selectedServices.reduce((s, sv) => s + sv.pricePesewas, 0),
    [selectedServices],
  );

  const handlePaymentSubmit = useCallback(
    async (data: PaymentFormData): Promise<void> => {
      if (!user || !sessionId) return;
      setIsSubmitting(true);
      try {
        const discountPesewas = Math.round((parseFloat(data.discount ?? '0') || 0) * 100);
        const netPesewas = Math.max(0, grossPesewas - discountPesewas);
        const amountPaidPesewas = Math.round(parseFloat(data.amountPaid) * 100);
        const changePesewas = Math.max(0, amountPaidPesewas - netPesewas);

        const payments = data.channel === 'split'
          ? [
              { channel: 'cash', amountPesewas: Math.round((parseFloat(data.splitCashAmount ?? '0') || 0) * 100), referenceNo: null },
              { channel: data.splitSecondChannel ?? 'momo', amountPesewas: Math.round((parseFloat(data.splitSecondAmount ?? '0') || 0) * 100), referenceNo: data.splitSecondRef ?? null },
            ]
          : [{ channel: data.channel, amountPesewas: amountPaidPesewas, referenceNo: data.referenceNo ?? null }];

        const timestamp = data.customTimestamp ? new Date(data.customTimestamp) : new Date();

        const recorded = await transactionService.recordSale({
          customerId: selectedCustomer?.id ?? null,
          services: selectedServices,
          discountPesewas,
          payments,
          amountPaidPesewas,
          changePesewas,
          notes: data.notes ?? null,
          timestamp,
          isTimestampManual: !!data.customTimestamp,
          staffId: user.id,
          sessionId,
        });

        triggerRefresh();
        setResult(recorded);
      } catch (err) {
        addToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to record transaction',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, sessionId, grossPesewas, selectedCustomer, selectedServices, transactionService, triggerRefresh, addToast],
  );

  const handleCashFlowSubmit = useCallback(
    async (data: CashFlowFormData): Promise<void> => {
      if (!user || !sessionId) return;
      setIsSubmitting(true);
      try {
        const amountPesewas = Math.round(parseFloat(data.amount) * 100);
        if (flowType === 'expense') {
          await transactionService.recordExpense({
            category: data.category,
            amountPesewas,
            paymentChannel: data.channel,
            referenceNo: data.referenceNo ?? null,
            notes: data.notes ?? null,
            timestamp: new Date(),
            staffId: user.id,
            sessionId,
          });
          addToast({ variant: 'success', message: 'Expense recorded successfully' });
        } else {
          await transactionService.recordOtherIncome({
            category: data.category,
            amountPesewas,
            paymentChannel: data.channel,
            referenceNo: data.referenceNo ?? null,
            notes: data.notes ?? null,
            timestamp: new Date(),
            staffId: user.id,
            sessionId,
          });
          addToast({ variant: 'success', message: 'Other income recorded successfully' });
        }
        triggerRefresh();
        navigate(ROUTES.TRANSACTIONS);
      } catch (err) {
        addToast({
          variant: 'error',
          message: err instanceof Error ? err.message : 'Failed to record entry',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, sessionId, flowType, transactionService, triggerRefresh, addToast, navigate],
  );

  if (result) {
    return (
      <div className="p-9">
        <SuccessScreen result={result} onDone={() => navigate(ROUTES.TRANSACTIONS)} />
      </div>
    );
  }

  return (
    <div className="p-9">
      <PageHeader title="New transaction" subtitle="Record a sale, expense, or other income" />

      {flowType === 'sale' && (
        <>
          <StepIndicator current={step} />
          {step === 1 && (
            <Step1Customer
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onFlowChange={handleFlowChange}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Services
              services={services}
              categories={categories}
              selected={selectedServices}
              onToggle={handleToggleService}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <Step3Payment
              grossPesewas={grossPesewas}
              customerName={selectedCustomer?.name ?? null}
              serviceNames={selectedServices.map((s) => s.name)}
              onBack={() => setStep(2)}
              onComplete={handlePaymentSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </>
      )}

      {(flowType === 'expense' || flowType === 'other_income') && (
        <CashFlowForm
          flowType={flowType}
          onSubmit={handleCashFlowSubmit}
          onFlowChange={handleFlowChange}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default NewTransactionPage;
