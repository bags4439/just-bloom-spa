import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { Customer, CreateCustomerDto } from '../types';
import type { ICustomerRepository } from './ICustomerRepository';

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

  async findById(id: string): Promise<Customer | null> {
    const row = this.selectOne(
      `SELECT id, name, phone, email, loyalty_points, notes,
              created_by, created_at, updated_at, deleted_at
       FROM customers WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async search(query: string): Promise<Customer[]> {
    const like = `%${query}%`;
    const rows = this.selectAll(
      `SELECT id, name, phone, email, loyalty_points, notes,
              created_by, created_at, updated_at, deleted_at
       FROM customers
       WHERE deleted_at IS NULL
         AND (name LIKE ? OR phone LIKE ?)
       ORDER BY name ASC
       LIMIT 10`,
      [like, like],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findAll(): Promise<Customer[]> {
    const rows = this.selectAll(
      `SELECT id, name, phone, email, loyalty_points, notes,
              created_by, created_at, updated_at, deleted_at
       FROM customers WHERE deleted_at IS NULL ORDER BY name ASC`,
    );
    return rows.map((r) => this.mapRow(r));
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const id = this.generateId();
    const now = this.nowIso();
    this.run(
      `INSERT INTO customers
         (id, name, phone, email, loyalty_points, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
      [id, dto.name, dto.phone, dto.email, dto.createdBy, now, now],
    );
    const customer = await this.findById(id);
    if (!customer) throw new Error('Failed to create customer');
    return customer;
  }

  async updateLoyaltyPoints(id: string, points: number): Promise<void> {
    this.run(
      `UPDATE customers SET loyalty_points = ?, updated_at = ? WHERE id = ?`,
      [points, this.nowIso(), id],
    );
  }
}
