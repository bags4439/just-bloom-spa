import React, { useCallback, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';

import { useAuth } from '../hooks/useAuth';

const schema = z
  .object({
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

interface PasswordChangeModalProps {
  isOpen: boolean;
  isFirstLogin?: boolean;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  isFirstLogin = false,
}) => {
  const { changePassword } = useAuth();
  const [isDone, setIsDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      try {
        await changePassword(data.newPassword);
        setIsDone(true);
      } catch (err) {
        setError('root', { message: err instanceof Error ? err.message : 'Failed to change password' });
      }
    },
    [changePassword, setError],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => undefined}
      title={isFirstLogin ? 'Set your password' : 'Password reset required'}
      description={
        isFirstLogin
          ? 'Welcome! Please set a secure password before continuing.'
          : 'Your password has been reset. Please set a new password to continue.'
      }
      hideClose
    >
      {isDone ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle size={40} className="text-green-600" />
          <p className="font-medium text-text-primary">Password set successfully</p>
          <p className="text-sm text-text-secondary">You can now use the app.</p>
          <Button type="button" onClick={() => window.location.reload()} className="mt-2">
            Continue
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4" noValidate>
          <Input
            label="New password"
            type="password"
            autoFocus
            hint="Min 8 chars, at least one number and one special character"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="Confirm password"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {errors.root && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>
          )}
          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Set password
          </Button>
        </form>
      )}
    </Modal>
  );
};
