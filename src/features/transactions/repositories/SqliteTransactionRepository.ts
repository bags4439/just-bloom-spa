import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database } from '@/shared/types';
import type {
  CreateTransactionDto,
  CreateExpenseDto,
  ITransactionRepository,
} from './ITransactionRepository';

export class SqliteTransactionRepository
  extends BaseRepository
  implements ITransactionRepository
{
  constructor(db: Database) {
    super(db);
  }

  async createSale(dto: CreateTransactionDto): Promise<void> {
    this.run('BEGIN TRANSACTION');
    try {
      this.run(
        `INSERT INTO transactions
           (id, ts, ts_is_manual, type, staff_id, customer_id,
            gross_pesewas, discount_pesewas, loyalty_redeemed_pesewas,
            amount_paid_pesewas, change_pesewas, net_pesewas, notes,
            created_at, updated_at)
         VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        [
          dto.id,
          dto.ts,
          dto.tsIsManual ? 1 : 0,
          dto.staffId,
          dto.customerId,
          dto.grossPesewas,
          dto.discountPesewas,
          dto.amountPaidPesewas,
          dto.changePesewas,
          dto.netPesewas,
          dto.notes,
          this.nowIso(),
          this.nowIso(),
        ],
      );

      for (const item of dto.serviceIds) {
        this.run(
          `INSERT INTO transaction_items
             (id, transaction_id, service_id, price_at_time_pesewas, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            this.generateId(),
            dto.id,
            item.serviceId,
            item.priceAtTimePesewas,
            this.nowIso(),
          ],
        );
      }

      for (const payment of dto.payments) {
        this.run(
          `INSERT INTO transaction_payments
             (id, transaction_id, channel, amount_pesewas, reference_no, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            this.generateId(),
            dto.id,
            payment.channel,
            payment.amountPesewas,
            payment.referenceNo,
            this.nowIso(),
          ],
        );
      }

      this.run('COMMIT');
    } catch (err) {
      this.run('ROLLBACK');
      throw err;
    }
  }

  async createExpense(dto: CreateExpenseDto): Promise<void> {
    const id = this.generateId();
    const now = this.nowIso();
    this.run(
      `INSERT INTO expenses
         (id, ts, staff_id, category, amount_pesewas,
          payment_channel, reference_no, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.ts,
        dto.staffId,
        dto.category,
        dto.amountPesewas,
        dto.paymentChannel,
        dto.referenceNo,
        dto.notes,
        now,
        now,
      ],
    );
  }
}
