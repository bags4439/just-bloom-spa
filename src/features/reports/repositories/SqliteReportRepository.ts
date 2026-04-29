import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type {
  RevenueReport,
  RevenueByChannel,
  ServicePopularityRow,
  StaffPerformanceRow,
  TopCustomerRow,
  DailyRevenuePoint,
} from '../types/report.types';
import type { IReportRepository } from './IReportRepository';

export class SqliteReportRepository
  extends BaseRepository
  implements IReportRepository
{
  constructor(db: Database) {
    super(db);
  }

  async getRevenueReport(from: string, to: string): Promise<RevenueReport> {
    const totalRevenue = this.selectScalar(
      `SELECT COALESCE(SUM(net_pesewas), 0)
       FROM transactions
       WHERE type = 'sale'
         AND voided_at IS NULL
         AND DATE(ts) >= ? AND DATE(ts) <= ?`,
      [from, to],
    );

    const transactionCount = this.selectScalar(
      `SELECT COUNT(*)
       FROM transactions
       WHERE type = 'sale'
         AND voided_at IS NULL
         AND DATE(ts) >= ? AND DATE(ts) <= ?`,
      [from, to],
    );

    const totalExpenses = this.selectScalar(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM expenses
       WHERE DATE(ts) >= ? AND DATE(ts) <= ?`,
      [from, to],
    );

    const totalOtherIncome = this.selectScalar(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM other_income
       WHERE DATE(ts) >= ? AND DATE(ts) <= ?`,
      [from, to],
    );

    const channelRows = this.selectAll(
      `SELECT tp.channel,
              COALESCE(SUM(tp.amount_pesewas), 0) AS amount,
              COUNT(DISTINCT t.id) AS cnt
       FROM transaction_payments tp
       JOIN transactions t ON t.id = tp.transaction_id
       WHERE t.type = 'sale'
         AND t.voided_at IS NULL
         AND DATE(t.ts) >= ? AND DATE(t.ts) <= ?
       GROUP BY tp.channel
       ORDER BY amount DESC`,
      [from, to],
    );

    const byChannel: RevenueByChannel[] = channelRows.map((row) => ({
      channel: this.toString(row[0]),
      amountPesewas: this.toNumber(row[1]),
      transactionCount: this.toNumber(row[2]),
    }));

    const totalRevenuePesewas = this.toNumber(totalRevenue ?? 0);
    const txCount = this.toNumber(transactionCount ?? 0);

    return {
      totalRevenuePesewas,
      totalExpensesPesewas: this.toNumber(totalExpenses ?? 0),
      totalOtherIncomePesewas: this.toNumber(totalOtherIncome ?? 0),
      netPositionPesewas:
        totalRevenuePesewas +
        this.toNumber(totalOtherIncome ?? 0) -
        this.toNumber(totalExpenses ?? 0),
      transactionCount: txCount,
      averageTransactionPesewas:
        txCount > 0 ? Math.round(totalRevenuePesewas / txCount) : 0,
      byChannel,
    };
  }

  async getDailyRevenue(from: string, to: string): Promise<DailyRevenuePoint[]> {
    const rows = this.selectAll(
      `SELECT DATE(ts) as d, COALESCE(SUM(net_pesewas), 0) as rev
       FROM transactions
       WHERE type = 'sale'
         AND voided_at IS NULL
         AND DATE(ts) >= ? AND DATE(ts) <= ?
       GROUP BY DATE(ts)
       ORDER BY d ASC`,
      [from, to],
    );

    const dbMap = new Map<string, number>();
    for (const row of rows) {
      dbMap.set(this.toString(row[0]), this.toNumber(row[1]));
    }

    // Fill all days in range including zeros
    const result: DailyRevenuePoint[] = [];
    const start = new Date(from + 'T00:00:00');
    const end = new Date(to + 'T00:00:00');
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      result.push({
        date: dateStr,
        dayLabel: current.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }),
        revenuePesewas: dbMap.get(dateStr) ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  async getServicePopularity(
    from: string,
    to: string,
  ): Promise<ServicePopularityRow[]> {
    const rows = this.selectAll(
      `SELECT
         s.id,
         s.name,
         sc.name AS category_name,
         COUNT(ti.id) AS session_count,
         COALESCE(SUM(ti.price_at_time_pesewas), 0) AS revenue
       FROM transaction_items ti
       JOIN services s ON s.id = ti.service_id
       JOIN service_categories sc ON sc.id = s.category_id
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.voided_at IS NULL
         AND DATE(t.ts) >= ? AND DATE(t.ts) <= ?
       GROUP BY s.id
       ORDER BY session_count DESC
       LIMIT 20`,
      [from, to],
    );

    return rows.map((row) => ({
      serviceId: this.toString(row[0]),
      serviceName: this.toString(row[1]),
      categoryName: this.toString(row[2]),
      sessionCount: this.toNumber(row[3]),
      revenuePesewas: this.toNumber(row[4]),
    }));
  }

  async getStaffPerformance(
    from: string,
    to: string,
  ): Promise<StaffPerformanceRow[]> {
    const rows = this.selectAll(
      `SELECT
         u.id,
         u.name,
         COUNT(t.id) AS txn_count,
         COALESCE(SUM(t.net_pesewas), 0) AS revenue,
         (SELECT s2.name
          FROM transaction_items ti2
          JOIN services s2 ON s2.id = ti2.service_id
          WHERE ti2.transaction_id IN (
            SELECT id FROM transactions
            WHERE staff_id = u.id
              AND voided_at IS NULL
              AND DATE(ts) >= ? AND DATE(ts) <= ?
          )
          GROUP BY s2.id
          ORDER BY COUNT(*) DESC
          LIMIT 1) AS top_service
       FROM users u
       LEFT JOIN transactions t
         ON t.staff_id = u.id
         AND t.voided_at IS NULL
         AND DATE(t.ts) >= ? AND DATE(t.ts) <= ?
       WHERE u.deleted_at IS NULL AND u.is_active = 1
       GROUP BY u.id
       ORDER BY revenue DESC`,
      [from, to, from, to],
    );

    return rows.map((row) => ({
      staffId: this.toString(row[0]),
      staffName: this.toString(row[1]),
      transactionCount: this.toNumber(row[2]),
      revenuePesewas: this.toNumber(row[3]),
      topService: this.toNullableString(row[4]),
    }));
  }

  async getTopCustomers(
    from: string,
    to: string,
    limit: number,
  ): Promise<TopCustomerRow[]> {
    const rows = this.selectAll(
      `SELECT
         c.id,
         c.name,
         COUNT(DISTINCT t.id) AS visit_count,
         COALESCE(SUM(t.net_pesewas), 0) AS total_spend,
         c.loyalty_points
       FROM customers c
       JOIN transactions t ON t.customer_id = c.id
       WHERE t.voided_at IS NULL
         AND t.type = 'sale'
         AND DATE(t.ts) >= ? AND DATE(t.ts) <= ?
         AND c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY total_spend DESC
       LIMIT ?`,
      [from, to, limit],
    );

    return rows.map((row) => ({
      customerId: this.toString(row[0]),
      customerName: this.toString(row[1]),
      visitCount: this.toNumber(row[2]),
      totalSpendPesewas: this.toNumber(row[3]),
      loyaltyPoints: this.toNumber(row[4]),
    }));
  }
}
