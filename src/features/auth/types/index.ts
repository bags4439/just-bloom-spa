import type { TimeStamped, SoftDeletable } from '@/shared/types';

export const UserRole = {
  STAFF: 'staff',
  MANAGER: 'manager',
  OWNER: 'owner',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Permission = {
  RECORD_TRANSACTION: 'record_transaction',
  VIEW_OWN_TRANSACTIONS: 'view_own_transactions',
  VIEW_ALL_TRANSACTIONS: 'view_all_transactions',
  VOID_TRANSACTION: 'void_transaction',
  FLAG_TRANSACTION: 'flag_transaction',
  MANAGE_CUSTOMERS: 'manage_customers',
  MANAGE_STAFF: 'manage_staff',
  MANAGE_MANAGERS: 'manage_managers',
  MANAGE_SERVICES: 'manage_services',
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  MANAGE_SETTINGS: 'manage_settings',
  CLOSE_DAY: 'close_day',
  EXPORT_DATA: 'export_data',
  RESTORE_DATA: 'restore_data',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.STAFF]: [
    Permission.RECORD_TRANSACTION,
    Permission.VIEW_OWN_TRANSACTIONS,
    Permission.VOID_TRANSACTION,
    Permission.MANAGE_CUSTOMERS,
  ],
  [UserRole.MANAGER]: [
    Permission.RECORD_TRANSACTION,
    Permission.VIEW_OWN_TRANSACTIONS,
    Permission.VIEW_ALL_TRANSACTIONS,
    Permission.VOID_TRANSACTION,
    Permission.FLAG_TRANSACTION,
    Permission.MANAGE_CUSTOMERS,
    Permission.MANAGE_STAFF,
    Permission.MANAGE_SERVICES,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.MANAGE_SETTINGS,
    Permission.CLOSE_DAY,
  ],
  [UserRole.OWNER]: Object.values(Permission) as Permission[],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface UserRecord extends TimeStamped, SoftDeletable {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdBy: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CreateUserDto {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  createdBy: string;
}

export interface ChangePasswordDto {
  userId: string;
  newPassword: string;
  actorId: string;
}
