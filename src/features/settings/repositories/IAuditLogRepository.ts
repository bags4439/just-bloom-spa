import type { AuditLogEntry, AuditLogFilters } from '../types/audit.types';

export interface IAuditLogRepository {
  getAll(
    filters: AuditLogFilters,
    page: number,
    pageSize: number,
  ): Promise<{ entries: AuditLogEntry[]; total: number }>;
}
