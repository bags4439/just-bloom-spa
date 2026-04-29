import type { ITransactionQueryRepository } from '@/features/transactions/repositories/ITransactionQueryRepository';
import type { IOtherIncomeRepository } from '@/features/transactions/repositories/IOtherIncomeRepository';
import type { DashboardStats, CreateDayClosureDto } from '../types';
import type { IDayClosureRepository } from '../repositories/IDayClosureRepository';
import type { AuditService } from '@/core/services/AuditService';

export class DashboardService {
  constructor(
    private readonly transactionQueryRepo: ITransactionQueryRepository,
    private readonly dayClosureRepo: IDayClosureRepository,
    private readonly auditService: AuditService,
    private readonly otherIncomeRepo: IOtherIncomeRepository,
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
      result.push({
        date: dateStr,
        dayLabel,
        revenueGhs: found?.revenueGhs ?? 0,
      });
    }

    return result;
  }

  async getStats(): Promise<DashboardStats> {
    const today = this.getTodayDate();
    const sixDaysAgo = this.getSixDaysAgoDate();

    const [dailyStats, weeklyRaw, recentTransactions, existingClosure, otherIncomeCash] =
      await Promise.all([
        this.transactionQueryRepo.getDailyStats(today),
        this.transactionQueryRepo.getWeeklyRevenue(sixDaysAgo),
        this.transactionQueryRepo.getRecent(5),
        this.dayClosureRepo.findByDate(today),
        this.otherIncomeRepo.getDailyCashTotal(today),
      ]);

    const cashInDrawerPesewas =
      dailyStats.cashSalesPesewas +
      otherIncomeCash -
      dailyStats.cashExpensesPesewas;

    return {
      date: today,
      totalRevenuePesewas: dailyStats.totalRevenuePesewas,
      transactionCount: dailyStats.transactionCount,
      topServiceName: dailyStats.topServiceName,
      cashInDrawerPesewas: Math.max(0, cashInDrawerPesewas),
      expectedCashPesewas: Math.max(0, cashInDrawerPesewas),
      weeklyRevenue: this.fillWeeklyRevenue(weeklyRaw),
      recentTransactions,
      isDayClosed: existingClosure !== null,
    };
  }

  async closeDay(dto: CreateDayClosureDto, sessionId: string): Promise<void> {
    const existing = await this.dayClosureRepo.findByDate(dto.closeDate);
    if (existing) {
      throw new Error('Today has already been closed');
    }

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
      },
    });
  }
}
