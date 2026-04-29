import type { SpaService, SpaServiceCategory } from '../types';

export interface ISpaServiceRepository {
  findAllActive(): Promise<SpaService[]>;
  findAllCategories(): Promise<SpaServiceCategory[]>;
}
