import React, { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { SpaService, SpaServiceCategory } from '@/features/spa-services/types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Select a category'),
  description: z.string().max(200).optional(),
  price: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    { message: 'Enter a valid price greater than zero' },
  ),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: SpaServiceCategory[];
  existing?: SpaService | null;
}

export const ServiceModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, categories, existing,
}) => {
  const { spaServiceService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);

  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: existing?.name ?? '',
        categoryId: existing?.categoryId ?? '',
        description: existing?.description ?? '',
        price: existing ? String(existing.pricePesewas / 100) : '',
      });
    }
  }, [isOpen, existing, reset]);

  const handleClose = useCallback((): void => { reset(); onClose(); }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        const dto = {
          name: data.name,
          categoryId: data.categoryId,
          description: data.description ?? null,
          pricePesewas: Math.round(parseFloat(data.price) * 100),
        };
        if (existing) {
          await spaServiceService.update(existing.id, dto, user, sessionId);
          addToast({ variant: 'success', message: 'Service updated successfully' });
        } else {
          await spaServiceService.create(dto, user, sessionId);
          addToast({ variant: 'success', message: 'Service added successfully' });
        }
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to save service',
        });
      }
    },
    [spaServiceService, user, sessionId, existing, addToast, handleClose, onSuccess, setError],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={existing ? 'Edit service' : 'Add new service'}
      size="sm"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          label="Service name"
          autoFocus
          placeholder="e.g. Swedish Massage (60 min)"
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Category
          </label>
          <select
            className="w-full rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('categoryId')}
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>
          )}
        </div>

        <Input
          label="Price (GHS)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          error={errors.price?.message}
          {...register('price')}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Description (optional)
          </label>
          <textarea
            rows={2}
            placeholder="Brief description of the service..."
            className="w-full resize-none rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('description')}
          />
        </div>

        {errors.root && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1 justify-center">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1 justify-center">
            {existing ? 'Save changes' : 'Add service'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
