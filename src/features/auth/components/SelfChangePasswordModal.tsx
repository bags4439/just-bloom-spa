import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useUiStore } from '@/stores/uiStore';

import { useAuth } from '../hooks/useAuth';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SelfChangePasswordModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const { changePassword } = useAuth();
  const addToast = useUiStore((s) => s.addToast);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleClose = useCallback((): void => {
    reset();
    setIsDone(false);
    onClose();
  }, [reset, onClose]);

  const toggleShowCurrent = useCallback((): void => {
    setShowCurrent((s) => !s);
  }, []);

  const toggleShowNew = useCallback((): void => {
    setShowNew((s) => !s);
  }, []);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      try {
        await changePassword(data.currentPassword, data.newPassword);
        setIsDone(true);
        addToast({ variant: 'success', message: 'Password changed successfully' });
      } catch (err) {
        setError('currentPassword', {
          message:
            err instanceof Error ? err.message : 'Failed to change password',
        });
      }
    },
    [changePassword, addToast, setError],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change password"
      description="Enter your current password to set a new one."
      size="sm"
    >
      {isDone ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={40} className="text-green-600" />
          <p className="font-medium text-text-primary">
            Password changed successfully
          </p>
          <Button onClick={handleClose} className="mt-2 w-full justify-center">
            Done
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label="Current password"
            type={showCurrent ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            error={errors.currentPassword?.message}
            rightElement={
              <button
                type="button"
                onClick={toggleShowCurrent}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="text-text-tertiary hover:text-text-secondary"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            {...register('currentPassword')}
          />
          <Input
            label="New password"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            hint="Min 8 chars, one number, one special character"
            error={errors.newPassword?.message}
            rightElement={
              <button
                type="button"
                onClick={toggleShowNew}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="text-text-tertiary hover:text-text-secondary"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            {...register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
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
              Change password
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
