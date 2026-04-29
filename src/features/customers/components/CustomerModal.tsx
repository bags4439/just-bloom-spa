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
import type { Customer } from '../types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(9, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  notes: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  existing?: Customer | null;
}

export const CustomerModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, existing,
}) => {
  const { customerService } = useServices();
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
        phone: existing?.phone ?? '',
        email: existing?.email ?? '',
        notes: existing?.notes ?? '',
      });
    }
  }, [isOpen, existing, reset]);

  const handleClose = useCallback((): void => {
    reset();
    onClose();
  }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        const dto = {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          notes: data.notes ?? null,
        };
        let result: Customer;
        if (existing) {
          result = await customerService.update(existing.id, dto, user.id, sessionId);
          addToast({ variant: 'success', message: 'Customer updated successfully' });
        } else {
          result = await customerService.create(dto, user.id, sessionId);
          addToast({ variant: 'success', message: 'Customer added successfully' });
        }
        handleClose();
        onSuccess(result);
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to save customer',
        });
      }
    },
    [customerService, user, sessionId, existing, addToast, handleClose, onSuccess, setError],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={existing ? 'Edit customer' : 'Add new customer'}
      size="sm"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          label="Full name"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Phone number"
          placeholder="024 000 0000"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Email address (optional)"
          type="email"
          placeholder="customer@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Notes (optional)
          </label>
          <textarea
            rows={3}
            placeholder="Preferences, allergies, special instructions..."
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
            {existing ? 'Save changes' : 'Add customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
