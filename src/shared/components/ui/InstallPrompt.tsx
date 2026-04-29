import React, { useEffect, useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';

import { Button } from './Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback((): void => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-border bg-white px-5 py-4 shadow-modal"
      style={{ minWidth: 320 }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-pale">
        <Download size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">
          Install Just Bloom Spa
        </p>
        <p className="text-xs text-text-secondary">
          Add to your desktop for quick access
        </p>
      </div>
      <Button size="sm" onClick={() => void handleInstall()}>
        Install
      </Button>
      <button
        onClick={handleDismiss}
        className="text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
};
