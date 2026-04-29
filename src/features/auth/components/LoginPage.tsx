import React, { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const LotusIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 44 44" fill="none" aria-hidden="true">
    <path
      d="M22 36C22 36 8 28 8 17C8 11 14 6 22 6C30 6 36 11 36 17C36 28 22 36 22 36Z"
      stroke="#C4962A"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M22 36C22 36 4 26 4 13C4 7 11 3 22 7"
      stroke="#C4962A"
      strokeWidth="1"
      fill="none"
      opacity="0.5"
    />
    <path
      d="M22 36C22 36 40 26 40 13C40 7 33 3 22 7"
      stroke="#C4962A"
      strokeWidth="1"
      fill="none"
      opacity="0.5"
    />
    <circle cx="22" cy="18" r="3.5" stroke="#C4962A" strokeWidth="1.5" fill="none" />
  </svg>
);

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = useCallback(
    async (data: LoginFormData): Promise<void> => {
      setServerError(null);
      try {
        await login(data);
        // Do NOT call navigate here. The Router watches isAuthenticated
        // in the auth store and transitions to the authenticated state
        // automatically when login calls setUser.
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Login failed');
      }
    },
    [login],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LotusIcon />
          <h1
            className="mt-3 text-2xl font-bold tracking-tight"
            style={{ color: '#142E20' }}
          >
            Just Bloom Spa
          </h1>
          <p
            className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: '#C4962A' }}
          >
            Rest · Reset · Glow
          </p>
        </div>

        <Card>
          <h2 className="mb-5 text-base font-semibold text-text-primary">
            Sign in to your account
          </h2>

          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              label="Username"
              autoComplete="username"
              autoFocus
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              {...register('password')}
            />

            {serverError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="mt-1 w-full"
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
