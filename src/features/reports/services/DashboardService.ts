import type { ITransactionQueryRepository } from '@/features/transactions/repositories/ITransactionQueryRepository';
import type { DashboardStats, CreateDayClosureDto, DayClosure } from '../types';
import type { IDayClosureRepository } from '../repositories/IDayClosureRepository';
import type { AuditService } from '@/core/services/AuditService';
import type { Database } from '@/shared/types';

export class DashboardService {
  constructor(
    private readonly transactionQueryRepo: ITransactionQueryRepository,
    private readonly dayClosureRepo: IDayClosureRepository,
    private readonly auditService: AuditService,
    private readonly db: Database,
  ) {}

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getSixDaysAgoDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }

  private fillWeeklyRevenue(
    dbPoints: Array<{ date: string; dayLabel: string; revenueGhs: number }>,
  ): Array<{ date: string; dayLabel: string; revenueGhs: number }> {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const found = dbPoints.find((p) => p.date === dateStr);
      result.push({ date: dateStr, dayLabel, revenueGhs: found?.revenueGhs ?? 0 });
    }
    return result;
  }

  private async getMetricsSince(sinceTs: string): Promise<{
    totalRevenuePesewas: number;
    transactionCount: number;
    topServiceName: string | null;
    cashSalesPesewas: number;
    cashExpensesPesewas: number;
    cashOtherIncomePesewas: number;
  }> {
    const revenue = await this.db.selectValueAsync(
      `SELECT COALESCE(SUM(net_pesewas), 0)
       FROM transactions
       WHERE type = 'sale' AND voided_at IS NULL AND ts > ?`,
      [sinceTs],
    );

    const count = await this.db.selectValueAsync(
      `SELECT COUNT(*)
       FROM transactions
       WHERE type = 'sale' AND voided_at IS NULL AND ts > ?`,
      [sinceTs],
    );

    const topServiceRow = await this.db.selectArraysAsync(
      `SELECT s.name
       FROM transaction_items ti
       JOIN services s ON s.id = ti.service_id
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.voided_at IS NULL AND t.ts > ? AND t.type = 'sale'
       GROUP BY s.id
       ORDER BY COUNT(*) DESC
       LIMIT 1`,
      [sinceTs],
    );

    const cashSales = await this.db.selectValueAsync(
      `SELECT COALESCE(SUM(t.net_pesewas), 0)
       FROM transactions t
       JOIN transaction_payments tp ON tp.transaction_id = t.id
       WHERE t.type = 'sale' AND t.voided_at IS NULL
         AND t.ts > ? AND tp.channel = 'cash'`,
      [sinceTs],
    );

    const cashExpenses = await this.db.selectValueAsync(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM expenses
       WHERE ts > ? AND payment_channel = 'cash'`,
      [sinceTs],
    );

    const cashOtherIncome = await this.db.selectValueAsync(
      `SELECT COALESCE(SUM(amount_pesewas), 0)
       FROM other_income
       WHERE ts > ? AND payment_channel = 'cash'`,
      [sinceTs],
    );

    const topRow = topServiceRow[0];
    const topName =
      topRow && topRow[0] !== null && topRow[0] !== undefined ? String(topRow[0]) : null;

    return {
      totalRevenuePesewas: Number(revenue ?? 0),
      transactionCount: Number(count ?? 0),
      topServiceName: topName,
      cashSalesPesewas: Number(cashSales ?? 0),
      cashExpensesPesewas: Number(cashExpenses ?? 0),
      cashOtherIncomePesewas: Number(cashOtherIncome ?? 0),
    };
  }

  async getStats(): Promise<DashboardStats> {
    const today = this.getTodayDate();
    const sixDaysAgo = this.getSixDaysAgoDate();

    const [lastClosure, weeklyRaw, recentTransactions] = await Promise.all([
      this.dayClosureRepo.findMostRecent(),
      this.transactionQueryRepo.getWeeklyRevenue(sixDaysAgo),
      this.transactionQueryRepo.getRecent(5),
    ]);

    const sinceTs = lastClosure
      ? lastClosure.closedAt.toISOString()
      : '1970-01-01T00:00:00.000Z';

    const metrics = await this.getMetricsSince(sinceTs);

    const cashInDrawerPesewas = Math.max(
      0,
      metrics.cashSalesPesewas +
        metrics.cashOtherIncomePesewas -
        metrics.cashExpensesPesewas,
    );

    const hasUnclosedTransactions =
      lastClosure === null || metrics.transactionCount > 0;

    return {
      date: today,
      totalRevenuePesewas: metrics.totalRevenuePesewas,
      transactionCount: metrics.transactionCount,
      topServiceName: metrics.topServiceName,
      cashInDrawerPesewas,
      expectedCashPesewas: cashInDrawerPesewas,
      weeklyRevenue: this.fillWeeklyRevenue(weeklyRaw),
      recentTransactions,
      isDayClosed: false,
      lastClosureAt: lastClosure ? lastClosure.closedAt.toISOString() : null,
      lastClosureNote: lastClosure?.notes ?? null,
      hasUnclosedTransactions,
      unclosedSince: lastClosure ? lastClosure.closedAt.toISOString() : null,
    };
  }

  async closeDay(dto: CreateDayClosureDto, sessionId: string): Promise<void> {
    await this.dayClosureRepo.create(dto);

    this.auditService.log({
      actorId: dto.closedBy,
      sessionId,
      action: 'DAY_CLOSED',
      entityType: 'day_closure',
      metadata: {
        date: dto.closeDate,
        expectedCashGhs: dto.expectedCashPesewas / 100,
        actualCashGhs: dto.actualCashPesewas / 100,
        discrepancyGhs: dto.discrepancyPesewas / 100,
        notes: dto.notes,
      },
    });
  }

  async getClosureHistory(from: string, to: string): Promise<DayClosure[]> {
    const rows = await this.db.selectArraysAsync(
      `SELECT id, close_date, closed_by, expected_cash_pesewas,
              actual_cash_pesewas, discrepancy_pesewas, notes, closed_at,
              u.name AS closed_by_name
       FROM day_closures dc
       JOIN users u ON u.id = dc.closed_by
       WHERE DATE(dc.closed_at) >= ? AND DATE(dc.closed_at) <= ?
       ORDER BY dc.closed_at DESC`,
      [from, to],
    );

    return rows.map((row) => {
      const nameRaw = row[8];
      const closedByName =
        nameRaw !== null && nameRaw !== undefined && String(nameRaw).trim() !== ''
          ? String(nameRaw)
          : undefined;
      return {
        id: String(row[0] ?? ''),
        closeDate: String(row[1] ?? ''),
        closedBy: String(row[2] ?? ''),
        expectedCashPesewas: Number(row[3] ?? 0),
        actualCashPesewas: Number(row[4] ?? 0),
        discrepancyPesewas: Number(row[5] ?? 0),
        notes: row[6] !== null && row[6] !== undefined ? String(row[6]) : null,
        closedAt: new Date(String(row[7] ?? '')),
        ...(closedByName !== undefined ? { closedByName } : {}),
      };
    });
  }
}
