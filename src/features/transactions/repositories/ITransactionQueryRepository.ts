import type { TransactionSummary, WeeklyRevenuePoint, TransactionDetail, TransactionFilters } from '../types';

export interface DailyTransactionStats {
  totalRevenuePesewas: number;
  transactionCount: number;
  topServiceName: string | null;
  cashSalesPesewas: number;
  cashExpensesPesewas: number;
}

export interface ITransactionQueryRepository {
  getDailyStats(date: string): Promise<DailyTransactionStats>;
  getWeeklyRevenue(fromDate: string): Promise<WeeklyRevenuePoint[]>;
  getRecent(limit: number): Promise<TransactionSummary[]>;
  getAll(filters: TransactionFilters): Promise<TransactionSummary[]>;
  getById(id: string): Promise<TransactionDetail | null>;
  getByCustomerId(customerId: string, limit: number): Promise<TransactionSummary[]>;
}
