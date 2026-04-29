import type { TransactionSummary, WeeklyRevenuePoint } from '../types';

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
}
