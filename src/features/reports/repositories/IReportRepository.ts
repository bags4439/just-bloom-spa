import type {
  RevenueReport,
  ServicePopularityRow,
  StaffPerformanceRow,
  TopCustomerRow,
  DailyRevenuePoint,
  MonthlyRevenuePoint,
  ExpenseBreakdownRow,
  YearToDateRevenue,
} from '../types/report.types';

export interface IReportRepository {
  getRevenueReport(from: string, to: string): Promise<RevenueReport>;
  getDailyRevenue(from: string, to: string): Promise<DailyRevenuePoint[]>;
  getMonthlyRevenue(from: string, to: string): Promise<MonthlyRevenuePoint[]>;
  getServicePopularity(from: string, to: string): Promise<ServicePopularityRow[]>;
  getStaffPerformance(from: string, to: string): Promise<StaffPerformanceRow[]>;
  getTopCustomers(from: string, to: string, limit: number): Promise<TopCustomerRow[]>;
  getExpenseBreakdown(from: string, to: string): Promise<ExpenseBreakdownRow[]>;
  getYearToDateRevenue(): Promise<YearToDateRevenue>;
}
