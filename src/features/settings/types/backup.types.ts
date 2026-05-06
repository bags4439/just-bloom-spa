export interface BackupTable {
  name: string;
  rows: Record<string, unknown>[];
}

export interface BackupFile {
  version: number;
  exportedAt: string;
  appName: string;
  tables: BackupTable[];
}

export const BACKUP_VERSION = 1;

// Tables to include in backup, in insertion order
// (respects foreign key dependencies)
export const BACKUP_TABLES = [
  'schema_version',
  'app_settings',
  'users',
  'service_categories',
  'services',
  'customers',
  'transactions',
  'transaction_items',
  'transaction_payments',
  'expenses',
  'other_income',
  'loyalty_ledger',
  'day_closures',
  'audit_logs',
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];
