import { create } from 'zustand';

import type { AuthUser } from '@/features/auth/types';

interface AuthState {
  user: AuthUser | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser, sessionId: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sessionId: null,
  isLoading: false,
  error: null,
  setUser: (user, sessionId) => set({ user, sessionId, error: null }),
  clearUser: () => set({ user: null, sessionId: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

export const selectUser = (state: AuthState): AuthUser | null => state.user;
export const selectSessionId = (state: AuthState): string | null => state.sessionId;
export const selectIsAuthenticated = (state: AuthState): boolean => state.user !== null;
