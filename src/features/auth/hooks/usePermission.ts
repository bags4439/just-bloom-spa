import { useAuthStore, selectUser } from '@/stores/authStore';

import { hasPermission, type Permission } from '../types';

export function usePermission(permission: Permission): boolean {
  const user = useAuthStore(selectUser);
  if (!user) return false;
  return hasPermission(user.role, permission, user.isSuperOwner);
}

export function useRequirePermission(permission: Permission): void {
  const allowed = usePermission(permission);
  if (!allowed) throw new Error(`Missing permission: ${permission}`);
}
