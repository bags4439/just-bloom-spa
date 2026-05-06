export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;   // ISO date string YYYY-MM-DD
  label: string;
}

export interface RevenueByChannel {
  channel: string;
  amountPesewas: number;
  transactionCount: number;
}

export interface RevenueReport {
  totalRevenuePesewas: number;
  totalExpensesPesewas: number;
  totalOtherIncomePesewas: number;
  netPositionPesewas: number;
  transactionCount: number;
  averageTransactionPesewas: number;
  byChannel: RevenueByChannel[];
}

export interface ServicePopularityRow {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  sessionCount: number;
  revenuePesewas: number;
}

export interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  transactionCount: number;
  revenuePesewas: number;
  topService: string | null;
}

export interface TopCustomerRow {
  customerId: string;
  customerName: string;
  visitCount: number;
  totalSpendPesewas: number;
  loyaltyPoints: number;
}

export interface DailyRevenuePoint {
  date: string;
  dayLabel: string;
  revenuePesewas: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  monthLabel: string;
  revenuePesewas: number;
}

export interface ExpenseBreakdownRow {
  category: string;
  totalPesewas: number;
  count: number;
  percentage: number;
}

export interface YearToDateRevenue {
  revenuePesewas: number;
  transactionCount: number;
  year: number;
}

export interface FullReport {
  dateRange: DateRange;
  revenue: RevenueReport;
  dailyRevenue: DailyRevenuePoint[];
  monthlyRevenue: MonthlyRevenuePoint[];
  servicePopularity: ServicePopularityRow[];
  staffPerformance: StaffPerformanceRow[];
  topCustomers: TopCustomerRow[];
  expenseBreakdown: ExpenseBreakdownRow[];
  yearToDateRevenue: YearToDateRevenue;
}
