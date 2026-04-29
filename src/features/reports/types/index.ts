export interface DayClosure {
  id: string;
  closeDate: string;
  closedBy: string;
  expectedCashPesewas: number;
  actualCashPesewas: number;
  discrepancyPesewas: number;
  notes: string | null;
  closedAt: Date;
}

export interface CreateDayClosureDto {
  closeDate: string;
  closedBy: string;
  expectedCashPesewas: number;
  actualCashPesewas: number;
  discrepancyPesewas: number;
  notes: string | null;
}

export interface DashboardStats {
  date: string;
  totalRevenuePesewas: number;
  transactionCount: number;
  topServiceName: string | null;
  cashInDrawerPesewas: number;
  expectedCashPesewas: number;
  weeklyRevenue: import('@/features/transactions/types').WeeklyRevenuePoint[];
  recentTransactions: import('@/features/transactions/types').TransactionSummary[];
  isDayClosed: boolean;
}
