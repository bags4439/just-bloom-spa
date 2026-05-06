import type { IReportRepository } from '../repositories/IReportRepository';
import type { FullReport, DateRange } from '../types/report.types';

export class ReportService {
  constructor(private readonly reportRepo: IReportRepository) {}

  async getFullReport(dateRange: DateRange): Promise<FullReport> {
    const [
      revenue,
      dailyRevenue,
      monthlyRevenue,
      servicePopularity,
      staffPerformance,
      topCustomers,
      expenseBreakdown,
      yearToDateRevenue,
    ] = await Promise.all([
      this.reportRepo.getRevenueReport(dateRange.from, dateRange.to),
      this.reportRepo.getDailyRevenue(dateRange.from, dateRange.to),
      this.reportRepo.getMonthlyRevenue(dateRange.from, dateRange.to),
      this.reportRepo.getServicePopularity(dateRange.from, dateRange.to),
      this.reportRepo.getStaffPerformance(dateRange.from, dateRange.to),
      this.reportRepo.getTopCustomers(dateRange.from, dateRange.to, 10),
      this.reportRepo.getExpenseBreakdown(dateRange.from, dateRange.to),
      this.reportRepo.getYearToDateRevenue(),
    ]);

    return {
      dateRange,
      revenue,
      dailyRevenue,
      monthlyRevenue,
      servicePopularity,
      staffPerformance,
      topCustomers,
      expenseBreakdown,
      yearToDateRevenue,
    };
  }
}
