import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card } from '@/shared/components/ui/Card';
import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore } from '@/stores/authStore';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

const FirstRunSetup: React.FC = () => {
  const { authService } = useServices();
  const { setUser } = useAuthStore();

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
        const user = await authService.createOwnerAccount(
          data.name,
          data.username,
          data.password,
        );
        // Do NOT call navigate here. The Router watches isAuthenticated
        // in the auth store and transitions to the authenticated state
        // automatically when setUser is called.
        setUser(
          {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            mustChangePassword: false,
            isSuperOwner: true,
          },
          crypto.randomUUID(),
        );
      } catch (err) {
        setError('root', {
          message: err instanceof Error ? err.message : 'Setup failed',
        });
      }
    },
    [authService, setUser, setError],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome to Just Bloom Spa
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Create the owner account to get started.
          </p>
        </div>
        <Card>
          <h2 className="mb-5 text-base font-semibold text-text-primary">
            Owner account setup
          </h2>
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
              label="Username"
              hint="Lowercase letters, numbers, underscores"
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="Min 8 chars, at least one number and one special character"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm password"
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
            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="mt-1 w-full"
            >
              Create account &amp; continue
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default FirstRunSetup;
