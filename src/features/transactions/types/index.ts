export const PaymentChannel = {
  CASH: 'cash',
  MOMO: 'momo',
  BANK: 'bank',
  SPLIT: 'split',
} as const;
export type PaymentChannel = (typeof PaymentChannel)[keyof typeof PaymentChannel];

export const TransactionType = {
  SALE: 'sale',
  EXPENSE: 'expense',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  COMPLETE: 'complete',
  VOIDED: 'voided',
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export interface TransactionSummary {
  id: string;
  timestamp: string;
  isTimestampManual: boolean;
  customerName: string;
  serviceNames: string[];
  netPesewas: number;
  primaryChannel: PaymentChannel;
  status: TransactionStatus;
  staffName: string;
}

export interface WeeklyRevenuePoint {
  date: string;
  dayLabel: string;
  revenueGhs: number;
}

export interface TransactionPaymentDetail {
  channel: string;
  amountPesewas: number;
  referenceNo: string | null;
}

export interface TransactionDetail extends TransactionSummary {
  grossPesewas: number;
  discountPesewas: number;
  amountPaidPesewas: number;
  changePesewas: number;
  notes: string | null;
  voidReason: string | null;
  voidedAt: Date | null;
  voidedByName: string | null;
  payments: TransactionPaymentDetail[];
  createdAt: Date;
}

export interface TransactionFilters {
  dateRange: 'today' | '7d' | '30d' | 'all';
  channel: string | null;
  status: 'all' | 'complete' | 'voided';
  search: string;
}

export interface ExpenseSummary {
  id: string;
  timestamp: string;
  category: string;
  amountPesewas: number;
  paymentChannel: string;
  referenceNo: string | null;
  notes: string | null;
  staffName: string;
}

export interface OtherIncomeSummary {
  id: string;
  timestamp: string;
  category: string;
  amountPesewas: number;
  paymentChannel: string;
  referenceNo: string | null;
  notes: string | null;
  staffName: string;
}

export interface RecordOtherIncomeInput {
  category: string;
  amountPesewas: number;
  paymentChannel: string;
  referenceNo: string | null;
  notes: string | null;
  timestamp: Date;
  staffId: string;
  sessionId: string;
}
