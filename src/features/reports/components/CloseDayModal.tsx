import React, { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { formatDateTime } from '@/shared/utils/formatDate';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/shared/utils/cn';
import type { DashboardStats } from '../types';

const schema = z.object({
  actualCash: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
    { message: 'Enter a valid cash amount' },
  ),
  notes: z.string().max(300).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stats: DashboardStats;
}

export const CloseDayModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, stats,
}) => {
  const { dashboardService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      actualCash: (stats.expectedCashPesewas / 100).toFixed(2),
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        actualCash: (stats.expectedCashPesewas / 100).toFixed(2),
        notes: '',
      });
    }
  }, [isOpen, stats.expectedCashPesewas, reset]);

  const actualCash = watch('actualCash');
  const actualPesewas = Math.round((parseFloat(actualCash ?? '0') || 0) * 100);
  const discrepancyPesewas = actualPesewas - stats.expectedCashPesewas;

  const handleClose = useCallback((): void => {
    reset();
    onClose();
  }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      const pes = Math.round((parseFloat(data.actualCash ?? '0') || 0) * 100);
      const disc = pes - stats.expectedCashPesewas;
      try {
        const today = new Date().toISOString().slice(0, 10);
        await dashboardService.closeDay(
          {
            closeDate: today,
            closedBy: user.id,
            expectedCashPesewas: stats.expectedCashPesewas,
            actualCashPesewas: pes,
            discrepancyPesewas: disc,
            notes: data.notes?.trim() ? data.notes.trim() : null,
          },
          sessionId,
        );
        addToast({ variant: 'success', message: 'Day closed successfully' });
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to close day',
        });
      }
    },
    [
      dashboardService, user, sessionId, stats.expectedCashPesewas,
      addToast, handleClose, onSuccess, setError,
    ],
  );

  const sinceLabel = stats.unclosedSince
    ? `since ${formatDateTime(stats.unclosedSince)}`
    : 'all time';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Close day"
      description={`Reconcile cash in drawer (${sinceLabel})`}
      size="sm"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        {stats.lastClosureAt && (
          <div className="rounded-lg bg-cream px-4 py-3 text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Last closed: </span>
            {formatDateTime(stats.lastClosureAt)}
            {stats.lastClosureNote && (
              <span className="ml-1 italic">— {stats.lastClosureNote}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-cream px-4 py-3">
          <span className="text-sm text-text-secondary">Expected in drawer</span>
          <span className="text-lg font-bold text-text-primary">
            {formatCurrencyCompact(stats.expectedCashPesewas)}
          </span>
        </div>

        <Input
          label="Actual cash in drawer (GHS)"
          type="number"
          step="0.01"
          min="0"
          autoFocus
          error={errors.actualCash?.message}
          {...register('actualCash')}
        />

        {actualCash !== undefined && actualCash !== '' && (
          <div
            className={cn(
              'flex items-center justify-between rounded-lg px-4 py-3',
              discrepancyPesewas === 0
                ? 'bg-green-50'
                : discrepancyPesewas > 0
                  ? 'bg-blue-50'
                  : 'bg-red-50',
            )}
          >
            <span className="text-sm font-medium text-text-primary">
              {discrepancyPesewas === 0
                ? '✓ Cash matches'
                : discrepancyPesewas > 0
                  ? '↑ Cash surplus'
                  : '↓ Cash shortage'}
            </span>
            <span
              className={cn(
                'text-lg font-bold',
                discrepancyPesewas === 0
                  ? 'text-green-700'
                  : discrepancyPesewas > 0
                    ? 'text-blue-700'
                    : 'text-red-700',
              )}
            >
              {discrepancyPesewas !== 0 && (discrepancyPesewas > 0 ? '+' : '')}
              {formatCurrencyCompact(Math.abs(discrepancyPesewas))}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Note (optional)
          </label>
          <textarea
            rows={2}
            placeholder='e.g. "End of day", "Mid-day check", "Public holiday early close"'
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
            Close day
          </Button>
        </div>
      </form>
    </Modal>
  );
};
