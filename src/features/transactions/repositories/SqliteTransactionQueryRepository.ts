import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { TransactionSummary, WeeklyRevenuePoint } from '../types';
import { PaymentChannel, TransactionStatus } from '../types';
import type {
  DailyTransactionStats,
  ITransactionQueryRepository,
} from './ITransactionQueryRepository';

export class SqliteTransactionQueryRepository
  extends BaseRepository
  implements ITransactionQueryRepository
{
  constructor(db: Database) {
    super(db);
  }

  async getDailyStats(date: string): Promise<DailyTransactionStats> {
    const revenue = this.selectScalar(
      `SELECT COALESCE(SUM(net_pesewas), 0)
       FROM transactions
       WHERE DATE(ts) = ? AND type = 'sale' AND voided_at IS NULL`,
      [date],
    );

    const count = this.selectScalar(
      `SELECT COUNT(*)
       FROM transactions
       WHERE DATE(ts) = ? AND type = 'sale' AND voided_at IS NULL`,
      [date],
    );

    const topServiceRow = this.selectOne(
      `SELECT s.name
       FROM transaction_items ti
       JOIN services s ON s.id = ti.service_id
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE DATE(t.ts) = ?
         AND t.type = 'sale'
         AND t.voided_at IS NULL
       GROUP BY s.id
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
      [date],
    );

    const cashSales = this.selectScalar(
      `SELECT COALESCE(SUM(tp.amount_pesewas), 0)
       FROM transaction_payments tp
       JOIN transactions t ON t.id = tp.transaction_id
       WHERE DATE(t.ts) = ?
         AND tp.channel = 'cash'
         AND t.voided_at IS NULL
         AND t.type = 'sale'`,
      [date],
    );

    const cashExpenses = this.selectScalar(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM expenses
       WHERE DATE(ts) = ? AND payment_channel = 'cash'`,
      [date],
    );

    return {
      totalRevenuePesewas: this.toNumber(revenue ?? 0),
      transactionCount: this.toNumber(count ?? 0),
      topServiceName: topServiceRow ? this.toNullableString(topServiceRow[0]) : null,
      cashSalesPesewas: this.toNumber(cashSales ?? 0),
      cashExpensesPesewas: this.toNumber(cashExpenses ?? 0),
    };
  }

  async getWeeklyRevenue(fromDate: string): Promise<WeeklyRevenuePoint[]> {
    const rows = this.selectAll(
      `SELECT DATE(ts) as d, COALESCE(SUM(net_pesewas), 0) as rev
       FROM transactions
       WHERE type = 'sale'
         AND voided_at IS NULL
         AND DATE(ts) >= ?
       GROUP BY DATE(ts)
       ORDER BY d ASC`,
      [fromDate],
    );

    return rows.map((row) => {
      const dateStr = this.toString(row[0]);
      const d = new Date(dateStr + 'T00:00:00');
      return {
        date: dateStr,
        dayLabel: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        revenueGhs: this.toNumber(row[1]) / 100,
      };
    });
  }

  async getRecent(limit: number): Promise<TransactionSummary[]> {
    const rows = this.selectAll(
      `SELECT
         t.id,
         t.ts,
         t.ts_is_manual,
         COALESCE(c.name, 'Walk-in') AS customer_name,
         t.net_pesewas,
         CASE WHEN t.voided_at IS NOT NULL THEN 'voided' ELSE 'complete' END AS status,
         u.name AS staff_name,
         (SELECT GROUP_CONCAT(s2.name, ', ')
          FROM transaction_items ti2
          JOIN services s2 ON s2.id = ti2.service_id
          WHERE ti2.transaction_id = t.id) AS service_names,
         (SELECT channel
          FROM transaction_payments
          WHERE transaction_id = t.id
          ORDER BY rowid
          LIMIT 1) AS primary_channel
       FROM transactions t
       LEFT JOIN customers c ON c.id = t.customer_id
       JOIN users u ON u.id = t.staff_id
       WHERE t.type = 'sale'
       ORDER BY t.ts DESC
       LIMIT ?`,
      [limit],
    );

    return rows.map((row) => this.mapSummaryRow(row));
  }

  private mapSummaryRow(row: SqlValue[]): TransactionSummary {
    const serviceNamesRaw = this.toNullableString(row[7]);
    const channelRaw = this.toNullableString(row[8]);

    return {
      id: this.toString(row[0]),
      timestamp: this.toString(row[1]),
      isTimestampManual: this.toBoolean(row[2]),
      customerName: this.toString(row[3]),
      netPesewas: this.toNumber(row[4]),
      status: (this.toString(row[5]) as TransactionStatus) ?? TransactionStatus.COMPLETE,
      staffName: this.toString(row[6]),
      serviceNames: serviceNamesRaw ? serviceNamesRaw.split(', ') : [],
      primaryChannel: (channelRaw as PaymentChannel) ?? PaymentChannel.CASH,
    };
  }
}
