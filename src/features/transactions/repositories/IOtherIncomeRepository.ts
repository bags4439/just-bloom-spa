import type { OtherIncomeSummary } from '../types';

export interface UpdateOtherIncomeDto {
  category: string;
  amountPesewas: number;
  paymentChannel: string;
  referenceNo: string | null;
  notes: string | null;
}

export interface IOtherIncomeRepository {
  create(dto: {
    ts: string;
    staffId: string;
    category: string;
    amountPesewas: number;
    paymentChannel: string;
    referenceNo: string | null;
    notes: string | null;
  }): Promise<void>;
  update(id: string, dto: UpdateOtherIncomeDto): Promise<void>;
  getAll(dateRange: 'today' | '7d' | '30d' | 'all'): Promise<OtherIncomeSummary[]>;
  getDailyCashTotal(date: string): Promise<number>;
}
