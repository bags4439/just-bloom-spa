import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { AuditLogEntry, AuditLogFilters } from '../types/audit.types';
import { ACTION_CATEGORIES as CATEGORIES } from '../types/audit.types';
import type { IAuditLogRepository } from './IAuditLogRepository';

export class SqliteAuditLogRepository
  extends BaseRepository
  implements IAuditLogRepository
{
  constructor(db: Database) {
    super(db);
  }

  private mapRow(row: SqlValue[]): AuditLogEntry {
    const parseJson = (val: SqlValue): unknown => {
      if (val === null || val === undefined) return null;
      try {
        return JSON.parse(String(val));
      } catch {
        return val;
      }
    };

    return {
      id: this.toString(row[0]),
      actorId: this.toNullableString(row[1]),
      actorName: this.toNullableString(row[2]),
      sessionId: this.toNullableString(row[3]),
      action: this.toString(row[4]),
      entityType: this.toNullableString(row[5]),
      entityId: this.toNullableString(row[6]),
      oldValue: parseJson(row[7] ?? null),
      newValue: parseJson(row[8] ?? null),
      metadata: parseJson(row[9] ?? null),
      createdAt: this.toDate(row[10]),
    };
  }

  private buildConditions(filters: AuditLogFilters): {
    conditions: string[];
    bind: SqlValue[];
  } {
    const conditions: string[] = [];
    const bind: SqlValue[] = [];

    if (filters.dateRange === 'today') {
      conditions.push("DATE(al.created_at) = DATE('now')");
    } else if (filters.dateRange === '7d') {
      conditions.push("DATE(al.created_at) >= DATE('now', '-6 days')");
    } else if (filters.dateRange === '30d') {
      conditions.push("DATE(al.created_at) >= DATE('now', '-29 days')");
    }

    if (filters.actorId) {
      conditions.push('al.actor_id = ?');
      bind.push(filters.actorId);
    }

    if (filters.actionCategory && CATEGORIES[filters.actionCategory]) {
      const actions = CATEGORIES[filters.actionCategory]!;
      const placeholders = actions.map(() => '?').join(', ');
      conditions.push(`al.action IN (${placeholders})`);
      bind.push(...(actions as SqlValue[]));
    }

    if (filters.search.trim().length > 0) {
      const like = `%${filters.search.trim()}%`;
      conditions.push(
        '(al.action LIKE ? OR al.entity_type LIKE ? OR al.entity_id LIKE ?)',
      );
      bind.push(like, like, like);
    }

    return { conditions, bind };
  }

  async getAll(
    filters: AuditLogFilters,
    page: number,
    pageSize: number,
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const { conditions, bind } = this.buildConditions(filters);
    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const totalValue = await this.selectScalar(
      `SELECT COUNT(*)
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ${where}`,
      bind,
    );
    const total = this.toNumber(totalValue ?? 0);

    const rows = await this.selectAll(
      `SELECT
         al.id,
         al.actor_id,
         COALESCE(u.name, 'System') AS actor_name,
         al.session_id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.old_value,
         al.new_value,
         al.metadata,
         al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...bind, pageSize, offset],
    );

    return { entries: rows.map((r) => this.mapRow(r)), total };
  }
}
