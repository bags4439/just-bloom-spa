import React, { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useServices } from '@/core/ServiceContainerContext';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Spinner } from '@/shared/components/ui/Spinner';
import { cn } from '@/shared/utils/cn';

import { useAuth } from '../hooks/useAuth';
import type { UserRecord, UserRole } from '../types';

/** Public fields only — never keep password hashes in React state for the picker. */
type LoginProfileUser = Pick<UserRecord, 'id' | 'name' | 'username' | 'role' | 'isActive'>;

function toLoginProfile(u: UserRecord): LoginProfileUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    isActive: u.isActive,
  };
}

// ─── Lotus icon ───────────────────────────────────────────────────────────────

const LotusIcon: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
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

// ─── Role colours ─────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, { bg: string; text: string; label: string }> = {
  owner: { bg: 'bg-accent/10', text: 'text-accent', label: 'Owner' },
  manager: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Manager' },
  staff: { bg: 'bg-primary-pale', text: 'text-primary', label: 'Staff' },
};

// ─── Avatar colour based on name ──────────────────────────────────────────────

const AVATAR_COLOURS: ReadonlyArray<{ bg: string; text: string }> = [
  { bg: '#E4F0E9', text: '#1D4D35' },
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#F5F3FF', text: '#6D28D9' },
  { bg: '#FFF3E0', text: '#C45600' },
  { bg: '#F0FDF4', text: '#15803D' },
];

function getAvatarColour(name: string): { bg: string; text: string } {
  const code = name.charCodeAt(0);
  const index = Number.isFinite(code) ? Math.abs(code) % AVATAR_COLOURS.length : 0;
  const picked = AVATAR_COLOURS[index];
  return picked ?? { bg: '#E4F0E9', text: '#1D4D35' };
}

// ─── Profile card ─────────────────────────────────────────────────────────────

interface ProfileCardProps {
  user: LoginProfileUser;
  onSelect: (user: LoginProfileUser) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = React.memo(({ user, onSelect }) => {
  const colour = getAvatarColour(user.name);
  const roleStyle = ROLE_STYLES[user.role];
  const initials = user.name
    .split(' ')
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const handleClick = useCallback((): void => {
    onSelect(user);
  }, [user, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 text-center shadow-card transition-all duration-150 hover:border-primary/30 hover:shadow-modal hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold transition-transform duration-150 group-hover:scale-105"
        style={{ background: colour.bg, color: colour.text }}
      >
        {initials}
      </div>

      <div>
        <p className="text-sm font-semibold leading-tight text-text-primary">{user.name}</p>
        <span
          className={cn(
            'mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
            roleStyle.bg,
            roleStyle.text,
          )}
        >
          {roleStyle.label}
        </span>
      </div>
    </button>
  );
});
ProfileCard.displayName = 'ProfileCard';

// ─── Password entry view ──────────────────────────────────────────────────────

const passwordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
type PasswordFormData = z.infer<typeof passwordSchema>;

interface PasswordEntryProps {
  user: LoginProfileUser;
  onBack: () => void;
}

const PasswordEntry: React.FC<PasswordEntryProps> = ({ user, onBack }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const colour = getAvatarColour(user.name);
  const initials = user.name
    .split(' ')
    .map((n) => n[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    resetField,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = useCallback(
    async (data: PasswordFormData): Promise<void> => {
      try {
        await login({ username: user.username, password: data.password });
      } catch (err) {
        setError('password', {
          message: err instanceof Error ? err.message : 'Incorrect password',
        });
        resetField('password');
      }
    },
    [login, user.username, setError, resetField],
  );

  const handleTogglePassword = useCallback((): void => {
    setShowPassword((s) => !s);
  }, []);

  return (
    <div className="w-full max-w-xs">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={15} />
        All profiles
      </button>

      <div className="mb-7 flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-card"
          style={{ background: colour.bg, color: colour.text }}
        >
          {initials}
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary">{user.name}</p>
          <p className="text-sm text-text-secondary">Enter your password to continue</p>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-3"
        noValidate
      >
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          error={errors.password?.message}
          rightElement={
            <button
              type="button"
              onClick={handleTogglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-text-tertiary transition-colors hover:text-text-secondary"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          {...register('password')}
        />
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
};

// ─── Main login page ──────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const { staffService } = useServices();
  const [users, setUsers] = useState<LoginProfileUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LoginProfileUser | null>(null);

  useEffect(() => {
    void staffService
      .getAll()
      .then((all) => {
        const roleOrder: Record<string, number> = { owner: 0, manager: 1, staff: 2 };
        const active = all
          .filter((u) => u.isActive)
          .sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3))
          .map(toLoginProfile);
        setUsers(active);
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [staffService]);

  const handleSelectUser = useCallback((user: LoginProfileUser): void => {
    setSelectedUser(user);
  }, []);

  const handleBack = useCallback((): void => {
    setSelectedUser(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        <LotusIcon size={48} />
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

      {selectedUser ? (
        <PasswordEntry user={selectedUser} onBack={handleBack} />
      ) : (
        <div className="w-full max-w-2xl">
          <p className="mb-5 text-center text-sm font-medium text-text-secondary">
            Who&apos;s signing in?
          </p>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-8 text-center">
              <p className="text-sm text-text-secondary">No active accounts found.</p>
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-4',
                users.length === 1 && 'mx-auto max-w-[180px] grid-cols-1',
                users.length === 2 && 'mx-auto max-w-sm grid-cols-2',
                users.length >= 3 && 'grid-cols-3',
              )}
            >
              {users.map((user) => (
                <ProfileCard key={user.id} user={user} onSelect={handleSelectUser} />
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-12 text-xs text-text-tertiary">
        Adenta – Rowi Junction, Accra, Ghana
      </p>
    </div>
  );
};

export default LoginPage;
