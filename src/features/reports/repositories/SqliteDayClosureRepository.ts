import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { DayClosure, CreateDayClosureDto } from '../types';
import type { IDayClosureRepository } from './IDayClosureRepository';

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
      `SELECT id, close_date, closed_by, expected_cash_pesewas,
              actual_cash_pesewas, discrepancy_pesewas, notes, closed_at
       FROM day_closures
       WHERE close_date = ?`,
      [date],
    );
    return row ? this.mapRow(row) : null;
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
    const result = await this.findByDate(dto.closeDate);
    if (!result) throw new Error('Failed to create day closure');
    return result;
  }
}
