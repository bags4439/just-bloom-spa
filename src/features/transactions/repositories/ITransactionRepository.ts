export interface CreateTransactionDto {
  id: string;
  ts: string;
  tsIsManual: boolean;
  type: 'sale' | 'expense';
  staffId: string;
  customerId: string | null;
  grossPesewas: number;
  discountPesewas: number;
  amountPaidPesewas: number;
  changePesewas: number;
  netPesewas: number;
  notes: string | null;
  serviceIds: Array<{ serviceId: string; priceAtTimePesewas: number }>;
  payments: Array<{ channel: string; amountPesewas: number; referenceNo: string | null }>;
}

export interface CreateExpenseDto {
  ts: string;
  staffId: string;
  category: string;
  amountPesewas: number;
  paymentChannel: string;
  referenceNo: string | null;
  notes: string | null;
}

export interface ITransactionRepository {
  createSale(dto: CreateTransactionDto): Promise<void>;
  createExpense(dto: CreateExpenseDto): Promise<void>;
  voidTransaction(id: string, reason: string, voidedBy: string): Promise<void>;
}
