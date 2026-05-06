import React, { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useServices } from '@/core/ServiceContainerContext';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type { ExpenseSummary, OtherIncomeSummary } from '../types';

const EXPENSE_CATEGORIES = [
  'Supplies', 'Utilities', 'Staff welfare', 'Maintenance',
  'Marketing', 'Transport', 'Other',
];

const OTHER_INCOME_CATEGORIES = [
  'Capital injection', 'Supplier refund', 'Equipment sale',
  'Loan received', 'Interest', 'Miscellaneous',
];

const schema = z.object({
  category: z.string().min(1, 'Select a category'),
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    { message: 'Enter a valid amount greater than zero' },
  ),
  channel: z.enum(['cash', 'momo', 'bank']),
  referenceNo: z.string().optional(),
  notes: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

interface CashFlowEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: ExpenseSummary | OtherIncomeSummary;
  type: 'expense' | 'other_income';
}

export const CashFlowEditModal: React.FC<CashFlowEditModalProps> = ({
  isOpen, onClose, onSuccess, entry, type,
}) => {
  const { transactionService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);

  const categories =
    type === 'expense' ? EXPENSE_CATEGORIES : OTHER_INCOME_CATEGORIES;

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch for channel-dependent fields
  const channel = watch('channel');

  useEffect(() => {
    if (isOpen) {
      const ch = entry.paymentChannel.toLowerCase();
      const channelValue: 'cash' | 'momo' | 'bank' =
        ch === 'momo' || ch === 'bank' || ch === 'cash' ? ch : 'cash';
      reset({
        category: entry.category,
        amount: String(entry.amountPesewas / 100),
        channel: channelValue,
        referenceNo: entry.referenceNo ?? '',
        notes: entry.notes ?? '',
      });
    }
  }, [isOpen, entry, reset]);

  const handleClose = useCallback((): void => {
    reset();
    onClose();
  }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        const dto = {
          category: data.category,
          amountPesewas: Math.round(parseFloat(data.amount) * 100),
          paymentChannel: data.channel,
          referenceNo: data.referenceNo?.trim() ? data.referenceNo.trim() : null,
          notes: data.notes?.trim() ? data.notes.trim() : null,
        };

        if (type === 'expense') {
          await transactionService.updateExpense(
            entry.id, dto, user.id, sessionId,
          );
        } else {
          await transactionService.updateOtherIncome(
            entry.id, dto, user.id, sessionId,
          );
        }

        addToast({
          variant: 'success',
          message: `${type === 'expense' ? 'Expense' : 'Other income'} updated successfully`,
        });
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to update',
        });
      }
    },
    [transactionService, type, entry.id, user, sessionId, addToast, handleClose, onSuccess, setError],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={type === 'expense' ? 'Edit expense' : 'Edit other income'}
      size="sm"
    >
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
                <input
                  type="radio"
                  value={ch}
                  className="sr-only"
                  {...register('channel')}
                />
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
            {...register('notes')}
          />
        </div>

        {errors.root && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1 justify-center"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="flex-1 justify-center"
          >
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
