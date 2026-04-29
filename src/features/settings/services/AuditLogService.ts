import type { AuditLogEntry, AuditLogFilters } from '../types/audit.types';
import type { IAuditLogRepository } from '../repositories/IAuditLogRepository';

const PAGE_SIZE = 50;

export class AuditLogService {
  constructor(private readonly auditLogRepo: IAuditLogRepository) {}

  async getEntries(
    filters: AuditLogFilters,
    page: number,
  ): Promise<{ entries: AuditLogEntry[]; total: number; pageSize: number }> {
    const result = await this.auditLogRepo.getAll(filters, page, PAGE_SIZE);
    return { ...result, pageSize: PAGE_SIZE };
  }
}
