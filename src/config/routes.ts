export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  TRANSACTIONS: '/transactions',
  NEW_TRANSACTION: '/transactions/new',
  TRANSACTION_DETAIL: '/transactions/:id',
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: '/customers/:id',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  SETTINGS_SERVICES: '/settings/services',
  SETTINGS_STAFF: '/settings/staff',
  SETTINGS_GENERAL: '/settings/general',
} as const;

export type Route = typeof ROUTES[keyof typeof ROUTES];
