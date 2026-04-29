import type { SpaService, SpaServiceCategory, CreateSpaServiceDto, UpdateSpaServiceDto } from '../types';

export interface ISpaServiceRepository {
  findAllActive(): Promise<SpaService[]>;
  findAll(): Promise<SpaService[]>;
  findAllCategories(): Promise<SpaServiceCategory[]>;
  findById(id: string): Promise<SpaService | null>;
  create(dto: CreateSpaServiceDto): Promise<SpaService>;
  update(id: string, dto: UpdateSpaServiceDto): Promise<SpaService>;
  toggleActive(id: string, isActive: boolean): Promise<void>;
}
