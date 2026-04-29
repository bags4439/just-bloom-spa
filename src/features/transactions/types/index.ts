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
