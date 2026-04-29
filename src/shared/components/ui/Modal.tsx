import React, { useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideClose = false,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hideClose) onClose();
    },
    [onClose, hideClose],
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className={cn('relative w-full rounded-xl bg-white shadow-modal', {
          'max-w-sm': size === 'sm',
          'max-w-md': size === 'md',
          'max-w-lg': size === 'lg',
        })}
        style={{ margin: '16px' }}
      >
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
          {!hideClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-4 -mr-1 -mt-1 p-1">
              <X size={16} />
            </Button>
          )}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
