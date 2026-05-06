import { SCHEMA_VERSION } from '@/core/database/schema';
import type { AuditService } from '@/core/services/AuditService';
import type { Database, SqlValue } from '@/shared/types';
import type { AuthUser } from '@/features/auth/types';
import { requirePermission, Permission } from '@/features/auth/types';
import {
  BACKUP_TABLES,
  BACKUP_VERSION,
  type BackupFile,
  type BackupTable,
} from '../types/backup.types';

export class BackupService {
  constructor(
    private readonly db: Database,
    private readonly auditService: AuditService,
  ) {}

  // ── Export ──────────────────────────────────────────────────────────────────

  async exportBackup(actor: AuthUser, sessionId: string): Promise<BackupFile> {
    requirePermission(actor.role, Permission.EXPORT_DATA, actor.isSuperOwner);

    const tables: BackupTable[] = [];

    for (const tableName of BACKUP_TABLES) {
      try {
        const rows = await this.db.selectArraysAsync(
          `SELECT * FROM ${tableName}`,
        );
        const colRows = await this.db.selectArraysAsync(
          `PRAGMA table_info(${tableName})`,
        );
        const columns = colRows.map((r) =>
          r[1] !== null && r[1] !== undefined ? String(r[1]) : '',
        );

        const records = rows.map((row) => {
          const record: Record<string, unknown> = {};
          columns.forEach((col, i) => {
            record[col] = row[i] ?? null;
          });
          return record;
        });

        tables.push({ name: tableName, rows: records });
      } catch {
        // Table may not exist yet — skip gracefully
        tables.push({ name: tableName, rows: [] });
      }
    }

    const backup: BackupFile = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      appName: 'Just Bloom Spa',
      tables,
    };

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'DATA_EXPORTED',
      metadata: {
        tableCount: tables.length,
        exportedAt: backup.exportedAt,
      },
    });

    return backup;
  }

  // ── Restore ─────────────────────────────────────────────────────────────────

  async restoreBackup(
    backup: BackupFile,
    actor: AuthUser,
    sessionId: string,
  ): Promise<void> {
    requirePermission(actor.role, Permission.RESTORE_DATA, actor.isSuperOwner);

    if (backup.version !== BACKUP_VERSION) {
      throw new Error(
        `Incompatible backup version: ${backup.version}. Expected: ${BACKUP_VERSION}`,
      );
    }

    if (backup.appName !== 'Just Bloom Spa') {
      throw new Error('This backup file was not created by Just Bloom Spa');
    }

    // Disable foreign keys temporarily during restore
    await this.db.execAsync('PRAGMA foreign_keys = OFF');

    try {
      // Clear all tables in reverse order to avoid FK violations
      const reversed = [...BACKUP_TABLES].reverse();
      for (const tableName of reversed) {
        try {
          await this.db.execAsync(`DELETE FROM ${tableName}`);
        } catch {
          // Table may not exist — skip
        }
      }

      // Re-insert all rows in forward order
      for (const table of backup.tables) {
        if (table.rows.length === 0) continue;

        const columns = Object.keys(table.rows[0]!);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT OR IGNORE INTO ${table.name} (${columns.join(', ')}) VALUES (${placeholders})`;

        for (const row of table.rows) {
          const values: SqlValue[] = columns.map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return null;
            if (typeof val === 'number') return val;
            return String(val);
          });
          try {
            await this.db.execAsync(sql, values);
          } catch {
            // Skip rows that fail (e.g. constraint violations from old data)
          }
        }
      }

      // Backups exported before schema_version was included leave this table empty
      // after DELETE, which would cause initialiseSchema to re-apply migrations.
      const schemaCount = await this.db.selectValueAsync(
        'SELECT COUNT(*) FROM schema_version',
      );
      if (Number(schemaCount ?? 0) === 0) {
        for (let v = 1; v <= SCHEMA_VERSION; v += 1) {
          await this.db.execAsync(
            'INSERT INTO schema_version (version) VALUES (?)',
            [v],
          );
        }
      }
    } finally {
      // Always re-enable foreign keys
      await this.db.execAsync('PRAGMA foreign_keys = ON');
    }

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'DATA_RESTORED',
      metadata: {
        backupExportedAt: backup.exportedAt,
        tableCount: backup.tables.length,
      },
    });
  }

  // ── Validate backup file ────────────────────────────────────────────────────

  validateBackupFile(data: unknown): BackupFile {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid backup file: not a valid JSON object');
    }

    const obj = data as Record<string, unknown>;

    if (obj['version'] === undefined || obj['version'] === null) {
      throw new Error('Invalid backup file: missing version field');
    }
    if (obj['appName'] !== 'Just Bloom Spa') {
      throw new Error('Invalid backup file: not a Just Bloom Spa backup');
    }
    if (!Array.isArray(obj['tables'])) {
      throw new Error('Invalid backup file: missing tables array');
    }

    return obj as unknown as BackupFile;
  }
}
