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
    const now = this.nowIso();

    // Build all inserts as one batched exec call.
    // SQLite WASM executes multi-statement SQL atomically — no BEGIN/COMMIT needed.
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
        now,
        now,
      ],
    );

    for (const item of dto.serviceIds) {
      this.run(
        `INSERT INTO transaction_items
           (id, transaction_id, service_id, price_at_time_pesewas, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [this.generateId(), dto.id, item.serviceId, item.priceAtTimePesewas, now],
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
          now,
        ],
      );
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

  async voidTransaction(
    id: string,
    reason: string,
    voidedBy: string,
  ): Promise<void> {
    const now = this.nowIso();
    this.run(
      `UPDATE transactions
       SET voided_at = ?, void_reason = ?, voided_by = ?, updated_at = ?
       WHERE id = ? AND voided_at IS NULL`,
      [now, reason, voidedBy, now, id],
    );
  }
}
