import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore, selectUser, selectSessionId, selectIsSuperOwner } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { UserRole } from '@/features/auth/types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
  role: z.enum([UserRole.STAFF, UserRole.MANAGER, UserRole.OWNER]),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StaffModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { staffService } = useServices();
  const user = useAuthStore(selectUser);
  const sessionId = useAuthStore(selectSessionId);
  const isSuperOwner = useAuthStore(selectIsSuperOwner);
  const addToast = useUiStore((s) => s.addToast);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: UserRole.STAFF },
  });

  const handleClose = useCallback((): void => { reset(); onClose(); }, [reset, onClose]);

  const onSubmit = useCallback(
    async (data: FormData): Promise<void> => {
      if (!user || !sessionId) return;
      try {
        await staffService.createStaffOrManager(
          {
            name: data.name,
            username: data.username,
            role: data.role,
            password: data.password,
          },
          user,
          sessionId,
        );
        addToast({
          variant: 'success',
          message: `${
            data.role === UserRole.OWNER
              ? 'Owner'
              : data.role === UserRole.MANAGER
                ? 'Manager'
                : 'Staff'
          } account created successfully`,
        });
        handleClose();
        onSuccess();
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Failed to create account',
        });
      }
    },
    [staffService, user, sessionId, addToast, handleClose, onSuccess, setError],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add staff account" size="sm">
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-4"
        noValidate
      >
        <Input label="Full name" autoFocus error={errors.name?.message} {...register('name')} />
        <Input
          label="Username"
          hint="Lowercase letters, numbers, underscores"
          error={errors.username?.message}
          {...register('username')}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Role
          </label>
          <select
            className="w-full rounded-md border border-border bg-cream px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            {...register('role')}
          >
            <option value={UserRole.STAFF}>Staff</option>
            <option value={UserRole.MANAGER}>Manager</option>
            {isSuperOwner && <option value={UserRole.OWNER}>Owner</option>}
          </select>
        </div>

        <Input
          label="Temporary password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          hint="Staff will be required to change this on first login"
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
            Create account
          </Button>
        </div>
      </form>
    </Modal>
  );
};
