import type {
  RevenueReport,
  ServicePopularityRow,
  StaffPerformanceRow,
  TopCustomerRow,
  DailyRevenuePoint,
} from '../types/report.types';

export interface IReportRepository {
  getRevenueReport(from: string, to: string): Promise<RevenueReport>;
  getDailyRevenue(from: string, to: string): Promise<DailyRevenuePoint[]>;
  getServicePopularity(from: string, to: string): Promise<ServicePopularityRow[]>;
  getStaffPerformance(from: string, to: string): Promise<StaffPerformanceRow[]>;
  getTopCustomers(from: string, to: string, limit: number): Promise<TopCustomerRow[]>;
}
