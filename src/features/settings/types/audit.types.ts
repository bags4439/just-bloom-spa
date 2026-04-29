export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  sessionId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: unknown | null;
  newValue: unknown | null;
  metadata: unknown | null;
  createdAt: Date;
}

export interface AuditLogFilters {
  actorId: string | null;
  actionCategory: string | null;
  dateRange: 'today' | '7d' | '30d' | 'all';
  search: string;
}

export const ACTION_CATEGORIES: Record<string, string[]> = {
  Authentication: ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'SESSION_TIMEOUT'],
  Transactions: [
    'TRANSACTION_CREATED',
    'TRANSACTION_VOIDED',
    'EXPENSE_RECORDED',
    'OTHER_INCOME_RECORDED',
  ],
  Customers: ['CUSTOMER_CREATED', 'CUSTOMER_UPDATED'],
  Staff: [
    'STAFF_CREATED',
    'STAFF_DISABLED',
    'STAFF_ENABLED',
    'STAFF_PASSWORD_RESET',
    'USER_CREATED',
    'OWNER_ACCOUNT_CREATED',
    'PASSWORD_CHANGED',
  ],
  Services: ['SERVICE_CREATED', 'SERVICE_UPDATED', 'SERVICE_ACTIVATED', 'SERVICE_DEACTIVATED'],
  'Day closure': ['DAY_CLOSED'],
  'Other income': ['OTHER_INCOME_RECORDED'],
};

export const ACTION_CATEGORY_LABELS = Object.keys(ACTION_CATEGORIES);
