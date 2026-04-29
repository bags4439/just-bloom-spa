import type { Database, SqlValue } from '@/shared/types';

export abstract class BaseRepository {
  constructor(protected readonly db: Database) {}

  protected generateId(): string {
    return crypto.randomUUID();
  }

  protected nowIso(): string {
    return new Date().toISOString();
  }

  protected toBoolean(value: SqlValue | undefined): boolean {
    return value === 1;
  }

  protected toNumber(value: SqlValue | undefined): number {
    return typeof value === 'number' ? value : Number(value ?? 0);
  }

  protected toString(value: SqlValue | undefined): string {
    return value === null || value === undefined ? '' : String(value);
  }

  protected toNullableString(value: SqlValue | undefined): string | null {
    return value === null || value === undefined ? null : String(value);
  }

  protected toDate(value: SqlValue | undefined): Date {
    return new Date(this.toString(value));
  }

  protected toNullableDate(value: SqlValue | undefined): Date | null {
    return value === null || value === undefined ? null : new Date(String(value));
  }

  protected selectOne(sql: string, bind?: SqlValue[]): SqlValue[] | null {
    const rows = this.db.selectArrays(sql, bind);
    return rows[0] ?? null;
  }

  protected selectAll(sql: string, bind?: SqlValue[]): SqlValue[][] {
    return this.db.selectArrays(sql, bind);
  }

  protected selectScalar(sql: string, bind?: SqlValue[]): SqlValue | undefined {
    return this.db.selectValue(sql, bind);
  }

  protected run(sql: string, bind?: SqlValue[]): void {
    this.db.exec(sql, bind ? { bind } : undefined);
  }
}
