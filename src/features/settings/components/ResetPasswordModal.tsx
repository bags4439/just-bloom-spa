import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { UserRecord } from '@/features/auth/types';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetUser: UserRecord;
}

export const ResetPasswordModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, targetUser,
}) => {
  const { staffService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const addToast = useUiStore((s) => s.addToast);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleClose = useCallback((): void => { reset(); onClose(); }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        await staffService.resetPassword(targetUser.id, data.password, user, sessionId);
        addToast({ variant: 'success', message: `Password reset for ${targetUser.name}` });
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to reset password',
        });
      }
    },
    [staffService, targetUser, user, sessionId, addToast, handleClose, onSuccess, setError],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Reset password — ${targetUser.name}`}
      description="The staff member will be required to change this password on their next login."
      size="sm"
    >
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input
          label="New temporary password"
          type={showPassword ? 'text' : 'password'}
          autoFocus
          error={errors.password?.message}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-text-tertiary hover:text-text-secondary"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          {...register('password')}
        />
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
            Reset password
          </Button>
        </div>
      </form>
    </Modal>
  );
};
