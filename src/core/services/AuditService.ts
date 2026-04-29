import type { Database, SqlValue } from '@/shared/types';

export interface AuditLogEntry {
  actorId?: string;
  sessionId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  constructor(private readonly db: Database) {}

  log(entry: AuditLogEntry): void {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const bind: SqlValue[] = [
      id,
      entry.actorId ?? null,
      entry.sessionId ?? null,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : null,
      entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null,
      entry.metadata !== undefined ? JSON.stringify(entry.metadata) : null,
      now,
    ];

    this.db.exec(
      `INSERT INTO audit_logs
         (id, actor_id, session_id, action, entity_type, entity_id,
          old_value, new_value, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      { bind },
    );
  }
}
