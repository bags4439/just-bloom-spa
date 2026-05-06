import { DEFAULT_APP_CONFIG } from '@/config/app.config';
import type { AuditService } from '@/core/services/AuditService';
import { UserRole } from '@/features/auth/types';
import type { ICustomerRepository } from '@/features/customers/repositories/ICustomerRepository';
import { VoidWindowExpiredError, InsufficientPermissionError, NotFoundError } from '@/shared/types/errors';
import type { AuthUser } from '@/features/auth/types';
import type {
  IOtherIncomeRepository,
  UpdateOtherIncomeDto,
} from '../repositories/IOtherIncomeRepository';
import type { ITransactionQueryRepository } from '../repositories/ITransactionQueryRepository';
import type {
  ITransactionRepository,
  CreateExpenseDto,
  UpdateExpenseDto,
} from '../repositories/ITransactionRepository';
import type { SpaService } from '@/features/spa-services/types';
import type { RecordOtherIncomeInput } from '../types';

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
    private readonly transactionQueryRepo: ITransactionQueryRepository,
    private readonly otherIncomeRepo: IOtherIncomeRepository,
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

  async voidTransaction(
    transactionId: string,
    reason: string,
    actor: AuthUser,
    sessionId: string,
  ): Promise<void> {
    const transaction = await this.transactionQueryRepo.getById(transactionId);
    if (!transaction) throw new NotFoundError('Transaction', transactionId);

    if (transaction.status === 'voided') {
      throw new Error('This transaction has already been voided');
    }

    if (actor.role === UserRole.STAFF) {
      // Staff can only void their own transactions
      if (transaction.staffName !== actor.name) {
        throw new InsufficientPermissionError('void another staff member\'s transaction');
      }
      // Staff can only void within the configured window
      const ageMs = Date.now() - new Date(transaction.timestamp).getTime();
      const windowMs = DEFAULT_APP_CONFIG.voidWindowMinutes * 60 * 1000;
      if (ageMs > windowMs) {
        throw new VoidWindowExpiredError();
      }
    }

    await this.transactionRepo.voidTransaction(transactionId, reason, actor.id);

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'TRANSACTION_VOIDED',
      entityType: 'transaction',
      entityId: transactionId,
      metadata: { reason },
    });
  }

  async recordOtherIncome(input: RecordOtherIncomeInput): Promise<void> {
    await this.otherIncomeRepo.create({
      ts: input.timestamp.toISOString(),
      staffId: input.staffId,
      category: input.category,
      amountPesewas: input.amountPesewas,
      paymentChannel: input.paymentChannel,
      referenceNo: input.referenceNo,
      notes: input.notes,
    });

    this.auditService.log({
      actorId: input.staffId,
      sessionId: input.sessionId,
      action: 'OTHER_INCOME_RECORDED',
      entityType: 'other_income',
      metadata: {
        category: input.category,
        amountPesewas: input.amountPesewas,
        channel: input.paymentChannel,
      },
    });
  }

  async updateExpense(
    id: string,
    dto: UpdateExpenseDto,
    actorId: string,
    sessionId: string,
  ): Promise<void> {
    await this.transactionRepo.updateExpense(id, dto);

    this.auditService.log({
      actorId,
      sessionId,
      action: 'EXPENSE_UPDATED',
      entityType: 'expense',
      entityId: id,
      metadata: {
        category: dto.category,
        amountPesewas: dto.amountPesewas,
        paymentChannel: dto.paymentChannel,
      },
    });
  }

  async updateOtherIncome(
    id: string,
    dto: UpdateOtherIncomeDto,
    actorId: string,
    sessionId: string,
  ): Promise<void> {
    await this.otherIncomeRepo.update(id, dto);

    this.auditService.log({
      actorId,
      sessionId,
      action: 'OTHER_INCOME_UPDATED',
      entityType: 'other_income',
      entityId: id,
      metadata: {
        category: dto.category,
        amountPesewas: dto.amountPesewas,
        paymentChannel: dto.paymentChannel,
      },
    });
  }
}
