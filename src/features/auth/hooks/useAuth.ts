import { useCallback } from 'react';

import { useServices } from '@/core/ServiceContainerContext';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';

import type { LoginCredentials, ChangePasswordDto, CreateUserDto } from '../types';

export function useAuth() {
  const { authService, sessionService } = useServices();
  const { setUser, clearUser, user, sessionId } = useAuthStore();
  const { unlock } = useSessionStore();

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const newSessionId = crypto.randomUUID();
      const userRecord = await authService.login(credentials, newSessionId);
      setUser(
        {
          id: userRecord.id,
          name: userRecord.name,
          username: userRecord.username,
          role: userRecord.role,
          mustChangePassword: userRecord.mustChangePassword,
        },
        newSessionId,
      );
      sessionService.start();
    },
    [authService, sessionService, setUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    if (user && sessionId) {
      await authService.logout(user.id, sessionId);
    }
    sessionService.stop();
    clearUser();
  }, [authService, sessionService, user, sessionId, clearUser]);

  const unlockSession = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const currentSessionId = sessionId ?? crypto.randomUUID();
      await authService.login(credentials, currentSessionId);
      sessionService.reset();
      unlock();
    },
    [authService, sessionService, sessionId, unlock],
  );

  const changePassword = useCallback(
    async (newPassword: string): Promise<void> => {
      if (!user || !sessionId) throw new Error('Not authenticated');
      const dto: ChangePasswordDto = { userId: user.id, newPassword, actorId: user.id };
      await authService.changePassword(dto, sessionId);
      setUser({ ...user, mustChangePassword: false }, sessionId);
    },
    [authService, user, sessionId, setUser],
  );

  const createUser = useCallback(
    async (dto: CreateUserDto): Promise<void> => {
      if (!sessionId) throw new Error('Not authenticated');
      await authService.createUser(dto, sessionId);
    },
    [authService, sessionId],
  );

  return { login, logout, unlockSession, changePassword, createUser, user };
}
