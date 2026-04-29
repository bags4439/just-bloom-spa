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
    return value === null || value === undefined
      ? null
      : new Date(String(value));
  }

  protected async selectOne(
    sql: string,
    bind?: SqlValue[],
  ): Promise<SqlValue[] | null> {
    const rows = await this.db.selectArraysAsync(sql, bind);
    return rows[0] ?? null;
  }

  protected async selectAll(
    sql: string,
    bind?: SqlValue[],
  ): Promise<SqlValue[][]> {
    return this.db.selectArraysAsync(sql, bind);
  }

  protected async selectScalar(
    sql: string,
    bind?: SqlValue[],
  ): Promise<SqlValue | undefined> {
    return this.db.selectValueAsync(sql, bind);
  }

  protected async run(sql: string, bind?: SqlValue[]): Promise<void> {
    await this.db.execAsync(sql, bind);
  }
}
