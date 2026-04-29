import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { ExpenseSummary } from '../types';

export class SqliteExpenseQueryRepository extends BaseRepository {
  constructor(db: Database) {
    super(db);
  }

  private mapRow(row: SqlValue[]): ExpenseSummary {
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

  async getAll(dateRange: 'today' | '7d' | '30d' | 'all'): Promise<ExpenseSummary[]> {
    let dateCondition = '';
    if (dateRange === 'today') dateCondition = "AND DATE(e.ts) = DATE('now')";
    else if (dateRange === '7d') dateCondition = "AND DATE(e.ts) >= DATE('now', '-6 days')";
    else if (dateRange === '30d') dateCondition = "AND DATE(e.ts) >= DATE('now', '-29 days')";

    const rows = this.selectAll(
      `SELECT e.id, e.ts, e.category, e.amount_pesewas,
              e.payment_channel, e.reference_no, e.notes, u.name
       FROM expenses e
       JOIN users u ON u.id = e.staff_id
       WHERE 1=1 ${dateCondition}
       ORDER BY e.ts DESC
       LIMIT 200`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  async getDailyCashTotal(date: string): Promise<number> {
    const value = this.selectScalar(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM expenses
       WHERE DATE(ts) = ? AND payment_channel = 'cash'`,
      [date],
    );
    return this.toNumber(value ?? 0);
  }
}
