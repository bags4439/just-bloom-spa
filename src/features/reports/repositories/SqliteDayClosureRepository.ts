import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { DayClosure, CreateDayClosureDto } from '../types';
import type { IDayClosureRepository } from './IDayClosureRepository';

const COLUMNS =
  'id, close_date, closed_by, expected_cash_pesewas, actual_cash_pesewas, discrepancy_pesewas, notes, closed_at';

export class SqliteDayClosureRepository
  extends BaseRepository
  implements IDayClosureRepository
{
  constructor(db: Database) {
    super(db);
  }

  private mapRow(row: SqlValue[]): DayClosure {
    return {
      id: this.toString(row[0]),
      closeDate: this.toString(row[1]),
      closedBy: this.toString(row[2]),
      expectedCashPesewas: this.toNumber(row[3]),
      actualCashPesewas: this.toNumber(row[4]),
      discrepancyPesewas: this.toNumber(row[5]),
      notes: this.toNullableString(row[6]),
      closedAt: this.toDate(row[7]),
    };
  }

  async findByDate(date: string): Promise<DayClosure | null> {
    const row = await this.selectOne(
      `SELECT ${COLUMNS} FROM day_closures
       WHERE close_date = ?
       ORDER BY closed_at DESC
       LIMIT 1`,
      [date],
    );
    return row ? this.mapRow(row) : null;
  }

  async findMostRecent(): Promise<DayClosure | null> {
    const row = await this.selectOne(
      `SELECT ${COLUMNS} FROM day_closures
       ORDER BY closed_at DESC
       LIMIT 1`,
    );
    return row ? this.mapRow(row) : null;
  }

  async findAll(limit = 50): Promise<DayClosure[]> {
    const rows = await this.selectAll(
      `SELECT ${COLUMNS} FROM day_closures
       ORDER BY closed_at DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async create(dto: CreateDayClosureDto): Promise<DayClosure> {
    const id = this.generateId();
    const now = this.nowIso();
    await this.run(
      `INSERT INTO day_closures
         (id, close_date, closed_by, expected_cash_pesewas,
          actual_cash_pesewas, discrepancy_pesewas, notes, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.closeDate,
        dto.closedBy,
        dto.expectedCashPesewas,
        dto.actualCashPesewas,
        dto.discrepancyPesewas,
        dto.notes,
        now,
      ],
    );
    const row = await this.selectOne(
      `SELECT ${COLUMNS} FROM day_closures WHERE id = ?`,
      [id],
    );
    if (!row) throw new Error('Failed to create day closure');
    return this.mapRow(row);
  }
}
