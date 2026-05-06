import type { DayClosure, CreateDayClosureDto } from '../types';

export interface IDayClosureRepository {
  findByDate(date: string): Promise<DayClosure | null>;
  findMostRecent(): Promise<DayClosure | null>;
  findAll(limit?: number): Promise<DayClosure[]>;
  create(dto: CreateDayClosureDto): Promise<DayClosure>;
}
