import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { formatCurrencyCompact } from '@/shared/utils/formatCurrency';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';

const schema = z.object({
  actualCash: z
    .string()
    .min(1, 'Enter the actual cash amount')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'Enter a valid amount',
    }),
  notes: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expectedCashPesewas: number;
  closeDate: string;
}

export const CloseDayModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  expectedCashPesewas,
  closeDate,
}) => {
  const { dashboardService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch for live cash discrepancy
  const actualCashValue = watch('actualCash');
  const actualPesewas = parseFloat(actualCashValue ?? '0') * 100;
  const liveDiscrepancy = isNaN(actualPesewas)
    ? null
    : Math.round(actualPesewas) - expectedCashPesewas;

  const handleClose = useCallback((): void => {
    reset();
    onClose();
  }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      const actualPesewasRounded = Math.round(parseFloat(data.actualCash) * 100);
      const disc = actualPesewasRounded - expectedCashPesewas;

      try {
        await dashboardService.closeDay(
          {
            closeDate,
            closedBy: user.id,
            expectedCashPesewas,
            actualCashPesewas: actualPesewasRounded,
            discrepancyPesewas: disc,
            notes: data.notes ?? null,
          },
          sessionId,
        );
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to close day',
        });
      }
    },
    [
      dashboardService,
      user,
      sessionId,
      closeDate,
      expectedCashPesewas,
      handleClose,
      onSuccess,
      setError,
    ],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Close day · ${new Date(closeDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      description="Reconcile today's cash before closing."
      size="md"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="rounded-lg bg-cream p-4 text-sm">
          <div className="flex justify-between py-1.5">
            <span className="text-text-secondary">Cash sales today</span>
            <span className="font-medium text-text-primary">
              {formatCurrencyCompact(expectedCashPesewas)}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2">
            <span className="font-semibold text-text-primary">Expected in drawer</span>
            <span className="font-bold text-primary">
              {formatCurrencyCompact(expectedCashPesewas)}
            </span>
          </div>
        </div>

        <Input
          label="Actual cash counted (GHS)"
          type="number"
          step="0.01"
          min="0"
          placeholder={`${(expectedCashPesewas / 100).toFixed(2)}`}
          autoFocus
          error={errors.actualCash?.message}
          {...register('actualCash')}
        />

        {liveDiscrepancy !== null && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              liveDiscrepancy === 0
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {liveDiscrepancy === 0
              ? '✓ Cash matches — no discrepancy'
              : `⚠ Discrepancy of ${formatCurrencyCompact(Math.abs(liveDiscrepancy))} ${liveDiscrepancy > 0 ? '(surplus)' : '(short)'}`}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Notes (optional)
          </label>
          <textarea
            className="w-full rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
            placeholder="Explain any discrepancy..."
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
            Confirm &amp; close day
          </Button>
        </div>
      </form>
    </Modal>
  );
};
