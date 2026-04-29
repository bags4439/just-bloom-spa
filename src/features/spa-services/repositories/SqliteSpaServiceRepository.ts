import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type {
  SpaService,
  SpaServiceCategory,
  CreateSpaServiceDto,
  UpdateSpaServiceDto,
} from '../types';
import type { ISpaServiceRepository } from './ISpaServiceRepository';

const SERVICE_COLUMNS = `
  s.id, s.category_id, sc.name as category_name,
  s.name, s.description, s.price_pesewas, s.is_active,
  s.created_by, s.created_at, s.updated_at, s.deleted_at
`;

export class SqliteSpaServiceRepository
  extends BaseRepository
  implements ISpaServiceRepository
{
  constructor(db: Database) {
    super(db);
  }

  private mapCategory(row: SqlValue[]): SpaServiceCategory {
    return {
      id: this.toString(row[0]),
      name: this.toString(row[1]),
      description: this.toNullableString(row[2]),
      displayOrder: this.toNumber(row[3]),
      isActive: this.toBoolean(row[4]),
    };
  }

  private mapService(row: SqlValue[]): SpaService {
    return {
      id: this.toString(row[0]),
      categoryId: this.toString(row[1]),
      categoryName: this.toString(row[2]),
      name: this.toString(row[3]),
      description: this.toNullableString(row[4]),
      pricePesewas: this.toNumber(row[5]),
      isActive: this.toBoolean(row[6]),
      createdBy: this.toString(row[7]),
      createdAt: this.toDate(row[8]),
      updatedAt: this.toDate(row[9]),
      deletedAt: this.toNullableDate(row[10]),
    };
  }

  async findAllCategories(): Promise<SpaServiceCategory[]> {
    const rows = this.selectAll(
      `SELECT id, name, description, display_order, is_active
       FROM service_categories
       WHERE is_active = 1
       ORDER BY display_order ASC`,
    );
    return rows.map((r) => this.mapCategory(r));
  }

  async findAllActive(): Promise<SpaService[]> {
    const rows = this.selectAll(
      `SELECT ${SERVICE_COLUMNS}
       FROM services s
       JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.is_active = 1 AND s.deleted_at IS NULL
       ORDER BY sc.display_order ASC, s.name ASC`,
    );
    return rows.map((r) => this.mapService(r));
  }

  async findAll(): Promise<SpaService[]> {
    const rows = this.selectAll(
      `SELECT ${SERVICE_COLUMNS}
       FROM services s
       JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.deleted_at IS NULL
       ORDER BY sc.display_order ASC, s.name ASC`,
    );
    return rows.map((r) => this.mapService(r));
  }

  async findById(id: string): Promise<SpaService | null> {
    const row = this.selectOne(
      `SELECT ${SERVICE_COLUMNS}
       FROM services s
       JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.id = ? AND s.deleted_at IS NULL`,
      [id],
    );
    return row ? this.mapService(row) : null;
  }

  async create(dto: CreateSpaServiceDto): Promise<SpaService> {
    const id = this.generateId();
    const now = this.nowIso();
    this.run(
      `INSERT INTO services
         (id, category_id, name, description, price_pesewas,
          is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, dto.categoryId, dto.name, dto.description, dto.pricePesewas,
       dto.createdBy, now, now],
    );
    const service = await this.findById(id);
    if (!service) throw new Error('Failed to create service');
    return service;
  }

  async update(id: string, dto: UpdateSpaServiceDto): Promise<SpaService> {
    this.run(
      `UPDATE services
       SET category_id = ?, name = ?, description = ?,
           price_pesewas = ?, updated_at = ?
       WHERE id = ?`,
      [dto.categoryId, dto.name, dto.description,
       dto.pricePesewas, this.nowIso(), id],
    );
    const service = await this.findById(id);
    if (!service) throw new Error('Failed to update service');
    return service;
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    this.run(
      `UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?`,
      [isActive ? 1 : 0, this.nowIso(), id],
    );
  }
}
