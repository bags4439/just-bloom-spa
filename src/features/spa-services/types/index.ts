import type { TimeStamped, SoftDeletable } from '@/shared/types';

export interface SpaServiceCategory {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface SpaService extends TimeStamped, SoftDeletable {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  pricePesewas: number;
  isActive: boolean;
  createdBy: string;
}

export interface CreateSpaServiceDto {
  categoryId: string;
  name: string;
  description: string | null;
  pricePesewas: number;
  createdBy: string;
}
