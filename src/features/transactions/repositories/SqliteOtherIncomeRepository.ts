import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { OtherIncomeSummary } from '../types';
import type { IOtherIncomeRepository } from './IOtherIncomeRepository';

export class SqliteOtherIncomeRepository
  extends BaseRepository
  implements IOtherIncomeRepository
{
  constructor(db: Database) {
    super(db);
  }

  private mapRow(row: SqlValue[]): OtherIncomeSummary {
    return {
      id: this.toString(row[0]),
      timestamp: this.toString(row[1]),
      category: this.toString(row[2]),
      amountPesewas: this.toNumber(row[3]),
      paymentChannel: this.toString(row[4]),
      referenceNo: this.toNullableString(row[5]),
      notes: this.toNullableString(row[6]),
      staffName: this.toString(row[7]),
    };
  }

  async create(dto: {
    ts: string;
    staffId: string;
    category: string;
    amountPesewas: number;
    paymentChannel: string;
    referenceNo: string | null;
    notes: string | null;
  }): Promise<void> {
    const id = this.generateId();
    const now = this.nowIso();
    this.run(
      `INSERT INTO other_income
         (id, ts, staff_id, category, amount_pesewas,
          payment_channel, reference_no, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, dto.ts, dto.staffId, dto.category, dto.amountPesewas,
        dto.paymentChannel, dto.referenceNo, dto.notes, now, now,
      ],
    );
  }

  async getAll(dateRange: 'today' | '7d' | '30d' | 'all'): Promise<OtherIncomeSummary[]> {
    let dateCondition = '';
    if (dateRange === 'today') dateCondition = "AND DATE(oi.ts) = DATE('now')";
    else if (dateRange === '7d') dateCondition = "AND DATE(oi.ts) >= DATE('now', '-6 days')";
    else if (dateRange === '30d') dateCondition = "AND DATE(oi.ts) >= DATE('now', '-29 days')";

    const rows = this.selectAll(
      `SELECT oi.id, oi.ts, oi.category, oi.amount_pesewas,
              oi.payment_channel, oi.reference_no, oi.notes, u.name
       FROM other_income oi
       JOIN users u ON u.id = oi.staff_id
       WHERE 1=1 ${dateCondition}
       ORDER BY oi.ts DESC
       LIMIT 200`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  async getDailyCashTotal(date: string): Promise<number> {
    const value = this.selectScalar(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM other_income
       WHERE DATE(ts) = ? AND payment_channel = 'cash'`,
      [date],
    );
    return this.toNumber(value ?? 0);
  }
}
