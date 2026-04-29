import { DEFAULT_APP_CONFIG } from '@/config/app.config';
import type { AuditService } from '@/core/services/AuditService';
import type { ICustomerRepository } from '@/features/customers/repositories/ICustomerRepository';
import type { ITransactionRepository, CreateExpenseDto } from '../repositories/ITransactionRepository';
import type { SpaService } from '@/features/spa-services/types';

export interface RecordSaleInput {
  customerId: string | null;
  services: SpaService[];
  discountPesewas: number;
  payments: Array<{ channel: string; amountPesewas: number; referenceNo: string | null }>;
  amountPaidPesewas: number;
  changePesewas: number;
  notes: string | null;
  timestamp: Date;
  isTimestampManual: boolean;
  staffId: string;
  sessionId: string;
}

export interface RecordExpenseInput {
  category: string;
  amountPesewas: number;
  paymentChannel: string;
  referenceNo: string | null;
  notes: string | null;
  timestamp: Date;
  staffId: string;
  sessionId: string;
}

export interface RecordedTransaction {
  id: string;
  netPesewas: number;
  grossPesewas: number;
  changePesewas: number;
  loyaltyPointsAwarded: number;
  customerName: string | null;
  serviceNames: string[];
  primaryChannel: string;
  timestamp: string;
}

export class TransactionService {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly customerRepo: ICustomerRepository,
    private readonly auditService: AuditService,
  ) {}

  async recordSale(input: RecordSaleInput): Promise<RecordedTransaction> {
    const id = crypto.randomUUID();
    const grossPesewas = input.services.reduce((s, sv) => s + sv.pricePesewas, 0);
    const netPesewas = grossPesewas - input.discountPesewas;

    await this.transactionRepo.createSale({
      id,
      ts: input.timestamp.toISOString(),
      tsIsManual: input.isTimestampManual,
      type: 'sale',
      staffId: input.staffId,
      customerId: input.customerId,
      grossPesewas,
      discountPesewas: input.discountPesewas,
      amountPaidPesewas: input.amountPaidPesewas,
      changePesewas: input.changePesewas,
      netPesewas,
      notes: input.notes,
      serviceIds: input.services.map((s) => ({
        serviceId: s.id,
        priceAtTimePesewas: s.pricePesewas,
      })),
      payments: input.payments,
    });

    let loyaltyPointsAwarded = 0;
    let customerName: string | null = null;

    if (input.customerId) {
      const customer = await this.customerRepo.findById(input.customerId);
      if (customer) {
        customerName = customer.name;
        const pointsToAward = Math.floor(
          netPesewas / (DEFAULT_APP_CONFIG.loyaltyPointsPerGhs * 100),
        );
        if (pointsToAward > 0) {
          const newBalance = customer.loyaltyPoints + pointsToAward;
          await this.customerRepo.updateLoyaltyPoints(input.customerId, newBalance);
          loyaltyPointsAwarded = pointsToAward;
        }
      }
    }

    this.auditService.log({
      actorId: input.staffId,
      sessionId: input.sessionId,
      action: 'TRANSACTION_CREATED',
      entityType: 'transaction',
      entityId: id,
      newValue: {
        type: 'sale',
        netPesewas,
        customerId: input.customerId,
        serviceCount: input.services.length,
        tsIsManual: input.isTimestampManual,
      },
    });

    const primaryPayment = input.payments[0];

    return {
      id,
      netPesewas,
      grossPesewas,
      changePesewas: input.changePesewas,
      loyaltyPointsAwarded,
      customerName,
      serviceNames: input.services.map((s) => s.name),
      primaryChannel: primaryPayment?.channel ?? 'cash',
      timestamp: input.timestamp.toISOString(),
    };
  }

  async recordExpense(input: RecordExpenseInput): Promise<void> {
    const dto: CreateExpenseDto = {
      ts: input.timestamp.toISOString(),
      staffId: input.staffId,
      category: input.category,
      amountPesewas: input.amountPesewas,
      paymentChannel: input.paymentChannel,
      referenceNo: input.referenceNo,
      notes: input.notes,
    };

    await this.transactionRepo.createExpense(dto);

    this.auditService.log({
      actorId: input.staffId,
      sessionId: input.sessionId,
      action: 'EXPENSE_RECORDED',
      entityType: 'expense',
      metadata: {
        category: input.category,
        amountPesewas: input.amountPesewas,
        channel: input.paymentChannel,
      },
    });
  }
}
