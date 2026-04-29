import React from 'react';

import { cn } from '@/shared/utils/cn';

export type BadgeVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'cash'
  | 'momo'
  | 'bank'
  | 'split';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700',
  danger: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
  neutral: 'bg-cream-dark text-text-secondary',
  cash: 'bg-primary-pale text-primary',
  momo: 'bg-orange-50 text-orange-700',
  bank: 'bg-blue-50 text-blue-700',
  split: 'bg-purple-50 text-purple-700',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      variantClasses[variant],
      className,
    )}
    {...props}
  >
    {children}
  </span>
);
