import type { SqlValue } from '@/shared/types';
import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database } from '@/shared/types';
import type { UserRecord, CreateUserDto, UserRole } from '../types';
import type { IUserRepository } from './IUserRepository';

const USER_COLUMNS = `
  id, name, username, password_hash, role,
  is_active, must_change_password, created_by,
  created_at, updated_at, deleted_at
`;

export class SqliteUserRepository extends BaseRepository implements IUserRepository {
  constructor(db: Database) {
    super(db);
  }

  private mapRow(row: SqlValue[]): UserRecord {
    return {
      id: this.toString(row[0] ?? null),
      name: this.toString(row[1] ?? null),
      username: this.toString(row[2] ?? null),
      passwordHash: this.toString(row[3] ?? null),
      role: this.toString(row[4] ?? null) as UserRole,
      isActive: this.toBoolean(row[5] ?? 0),
      mustChangePassword: this.toBoolean(row[6] ?? 0),
      createdBy: this.toNullableString(row[7] ?? null),
      createdAt: this.toDate(row[8] ?? null),
      updatedAt: this.toDate(row[9] ?? null),
      deletedAt: this.toNullableDate(row[10] ?? null),
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.selectOne(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const row = await this.selectOne(
      `SELECT ${USER_COLUMNS} FROM users WHERE username = ? AND deleted_at IS NULL`,
      [username],
    );
    return row ? this.mapRow(row) : null;
  }

  async findAll(): Promise<UserRecord[]> {
    const rows = await this.selectAll(
      `SELECT ${USER_COLUMNS} FROM users WHERE deleted_at IS NULL ORDER BY name ASC`,
    );
    return rows.map((row) => this.mapRow(row));
  }

  async findActive(): Promise<UserRecord[]> {
    const rows = await this.selectAll(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name ASC`,
    );
    return rows.map((row) => this.mapRow(row));
  }

  async countAll(): Promise<number> {
    const value = await this.selectScalar(
      `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`,
    );
    return this.toNumber(value ?? 0);
  }

  async create(dto: CreateUserDto, passwordHash: string): Promise<UserRecord> {
    const id = this.generateId();
    const now = this.nowIso();
    await this.run(
      `INSERT INTO users
         (id, name, username, password_hash, role, is_active,
          must_change_password, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?)`,
      [id, dto.name, dto.username, passwordHash, dto.role, dto.createdBy, now, now],
    );
    const user = await this.findById(id);
    if (!user) throw new Error('Failed to create user — record not found after insert');
    return user;
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
      passwordHash,
      this.nowIso(),
      userId,
    ]);
  }

  async setMustChangePassword(userId: string, value: boolean): Promise<void> {
    await this.run(`UPDATE users SET must_change_password = ?, updated_at = ? WHERE id = ?`, [
      value ? 1 : 0,
      this.nowIso(),
      userId,
    ]);
  }

  async setActive(userId: string, isActive: boolean): Promise<void> {
    await this.run(`UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?`, [
      isActive ? 1 : 0,
      this.nowIso(),
      userId,
    ]);
  }

  async softDelete(userId: string): Promise<void> {
    const now = this.nowIso();
    await this.run(`UPDATE users SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
      now,
      now,
      userId,
    ]);
  }
}
