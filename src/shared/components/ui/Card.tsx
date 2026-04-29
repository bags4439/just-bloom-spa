import React from 'react';

import { cn } from '@/shared/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ padding = 'md', className, children, ...props }) => (
  <div
    className={cn(
      'rounded-lg border border-border bg-white shadow-card',
      {
        'p-0': padding === 'none',
        'p-4': padding === 'sm',
        'p-5 sm:p-6': padding === 'md',
        'p-6 sm:p-8': padding === 'lg',
      },
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex items-center justify-between border-b border-border pb-4 mb-4', className)}
    {...props}
  />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => <h3 className={cn('text-sm font-semibold text-text-primary', className)} {...props} />;
