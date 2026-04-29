import { BaseRepository } from '@/core/repositories/BaseRepository';
import type { Database, SqlValue } from '@/shared/types';
import type { SpaService, SpaServiceCategory } from '../types';
import type { ISpaServiceRepository } from './ISpaServiceRepository';

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
      `SELECT s.id, s.category_id, sc.name as category_name,
              s.name, s.description, s.price_pesewas, s.is_active,
              s.created_by, s.created_at, s.updated_at, s.deleted_at
       FROM services s
       JOIN service_categories sc ON sc.id = s.category_id
       WHERE s.is_active = 1 AND s.deleted_at IS NULL
       ORDER BY sc.display_order ASC, s.name ASC`,
    );
    return rows.map((r) => this.mapService(r));
  }
}
