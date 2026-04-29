import type { DayClosure, CreateDayClosureDto } from '../types';

export interface IDayClosureRepository {
  findByDate(date: string): Promise<DayClosure | null>;
  create(dto: CreateDayClosureDto): Promise<DayClosure>;
}
