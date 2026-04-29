import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type {
  Customer,
  CustomerWithStats,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../types';
import type { ICustomerRepository } from './ICustomerRepository';

const BASE_COLUMNS = `
  c.id, c.name, c.phone, c.email, c.loyalty_points, c.notes,
  c.created_by, c.created_at, c.updated_at, c.deleted_at
`;

const STATS_COLUMNS = `
  COUNT(DISTINCT t.id) AS visit_count,
  COALESCE(SUM(CASE WHEN t.voided_at IS NULL THEN t.net_pesewas ELSE 0 END), 0) AS total_spend_pesewas,
  MAX(CASE WHEN t.voided_at IS NULL THEN t.ts ELSE NULL END) AS last_visit_ts
`;

export class SqliteCustomerRepository
  extends BaseRepository
  implements ICustomerRepository
{
  constructor(db: Database) {
    super(db);
  }

  private mapRow(row: SqlValue[]): Customer {
    return {
      id: this.toString(row[0]),
      name: this.toString(row[1]),
      phone: this.toString(row[2]),
      email: this.toNullableString(row[3]),
      loyaltyPoints: this.toNumber(row[4]),
      notes: this.toNullableString(row[5]),
      createdBy: this.toString(row[6]),
      createdAt: this.toDate(row[7]),
      updatedAt: this.toDate(row[8]),
      deletedAt: this.toNullableDate(row[9]),
    };
  }

  private mapWithStatsRow(row: SqlValue[]): CustomerWithStats {
    return {
      ...this.mapRow(row),
      visitCount: this.toNumber(row[10]),
      totalSpendPesewas: this.toNumber(row[11]),
      lastVisitTs: this.toNullableString(row[12]),
    };
  }

  async findById(id: string): Promise<Customer | null> {
    const row = await this.selectOne(
      `SELECT ${BASE_COLUMNS}
       FROM customers c
       WHERE c.id = ? AND c.deleted_at IS NULL`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async findByIdWithStats(id: string): Promise<CustomerWithStats | null> {
    const row = await this.selectOne(
      `SELECT ${BASE_COLUMNS}, ${STATS_COLUMNS}
       FROM customers c
       LEFT JOIN transactions t
         ON t.customer_id = c.id AND t.type = 'sale'
       WHERE c.id = ? AND c.deleted_at IS NULL
       GROUP BY c.id`,
      [id],
    );
    return row ? this.mapWithStatsRow(row) : null;
  }

  async findAllWithStats(search?: string): Promise<CustomerWithStats[]> {
    const hasSearch = search && search.trim().length > 0;
    const like = hasSearch ? `%${search!.trim()}%` : null;

    const rows = await this.selectAll(
      `SELECT ${BASE_COLUMNS}, ${STATS_COLUMNS}
       FROM customers c
       LEFT JOIN transactions t
         ON t.customer_id = c.id AND t.type = 'sale'
       WHERE c.deleted_at IS NULL
         ${hasSearch ? 'AND (c.name LIKE ? OR c.phone LIKE ?)' : ''}
       GROUP BY c.id
       ORDER BY c.name ASC`,
      hasSearch && like ? [like, like] : [],
    );
    return rows.map((r) => this.mapWithStatsRow(r));
  }

  async search(query: string): Promise<Customer[]> {
    const like = `%${query}%`;
    const rows = await this.selectAll(
      `SELECT ${BASE_COLUMNS}
       FROM customers c
       WHERE c.deleted_at IS NULL
         AND (c.name LIKE ? OR c.phone LIKE ?)
       ORDER BY name ASC
       LIMIT 10`,
      [like, like],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findAll(): Promise<Customer[]> {
    const rows = await this.selectAll(
      `SELECT ${BASE_COLUMNS}
       FROM customers c
       WHERE c.deleted_at IS NULL ORDER BY c.name ASC`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const id = this.generateId();
    const now = this.nowIso();
    await this.run(
      `INSERT INTO customers
         (id, name, phone, email, loyalty_points, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
      [id, dto.name, dto.phone, dto.email, dto.createdBy, now, now],
    );
    const customer = await this.findById(id);
    if (!customer) throw new Error('Failed to create customer');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.run(
      `UPDATE customers
       SET name = ?, phone = ?, email = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [dto.name, dto.phone, dto.email, dto.notes, this.nowIso(), id],
    );
    const customer = await this.findById(id);
    if (!customer) throw new Error('Failed to update customer');
    return customer;
  }

  async updateLoyaltyPoints(id: string, points: number): Promise<void> {
    await this.run(
      `UPDATE customers SET loyalty_points = ?, updated_at = ? WHERE id = ?`,
      [points, this.nowIso(), id],
    );
  }
}
