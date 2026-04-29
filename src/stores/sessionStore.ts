import { create } from 'zustand';
import { DEFAULT_APP_CONFIG } from '@/config/app.config';

type SessionStatus = 'active' | 'warning' | 'locked';

interface SessionState {
  status: SessionStatus;
  lastActivityAt: number;
  timeoutMs: number;
  warningMs: number;
  lock: () => void;
  unlock: () => void;
  recordActivity: () => void;
  setTimeoutMinutes: (minutes: number) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'active',
  lastActivityAt: Date.now(),
  timeoutMs: DEFAULT_APP_CONFIG.sessionTimeoutMinutes * 60 * 1000,
  warningMs: DEFAULT_APP_CONFIG.sessionWarningMinutes * 60 * 1000,
  lock: () => set({ status: 'locked' }),
  unlock: () => set({ status: 'active', lastActivityAt: Date.now() }),
  recordActivity: () => set({ lastActivityAt: Date.now(), status: 'active' }),
  setTimeoutMinutes: (minutes) => set({ timeoutMs: minutes * 60 * 1000 }),
}));
