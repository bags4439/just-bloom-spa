import React, { useCallback, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore, selectUser } from '@/stores/authStore';

import { useAuth } from '../hooks/useAuth';

const schema = z.object({ password: z.string().min(1, 'Password is required') });
type FormData = z.infer<typeof schema>;

export const LockScreen: React.FC = () => {
  const user = useAuthStore(selectUser);
  const { unlockSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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
      if (!user) return;
      try {
        await unlockSession({ username: user.username, password: data.password });
      } catch {
        setError('password', { message: 'Incorrect password' });
      }
    },
    [user, unlockSession, setError],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20, 46, 32, 0.92)' }}
    >
      <div className="w-full max-w-xs rounded-xl bg-white p-8 text-center shadow-modal">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-pale">
          <Lock size={22} className="text-primary" />
        </div>
        <h2 className="mb-1 text-base font-semibold text-text-primary">Session locked</h2>
        <p className="mb-6 text-sm text-text-secondary">
          Enter your password to unlock, {user?.name?.split(' ')[0]}.
        </p>
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-3" noValidate>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
            autoFocus
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-text-tertiary hover:text-text-secondary"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
            {...register('password')}
          />
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
};
