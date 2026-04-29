import type { IReportRepository } from '../repositories/IReportRepository';
import type { FullReport, DateRange } from '../types/report.types';

export class ReportService {
  constructor(private readonly reportRepo: IReportRepository) {}

  async getFullReport(dateRange: DateRange): Promise<FullReport> {
    const [revenue, dailyRevenue, servicePopularity, staffPerformance, topCustomers] =
      await Promise.all([
        this.reportRepo.getRevenueReport(dateRange.from, dateRange.to),
        this.reportRepo.getDailyRevenue(dateRange.from, dateRange.to),
        this.reportRepo.getServicePopularity(dateRange.from, dateRange.to),
        this.reportRepo.getStaffPerformance(dateRange.from, dateRange.to),
        this.reportRepo.getTopCustomers(dateRange.from, dateRange.to, 10),
      ]);

    return {
      dateRange,
      revenue,
      dailyRevenue,
      servicePopularity,
      staffPerformance,
      topCustomers,
    };
  }
}
