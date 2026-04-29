import type { Customer, CreateCustomerDto } from '../types';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  search(query: string): Promise<Customer[]>;
  findAll(): Promise<Customer[]>;
  create(dto: CreateCustomerDto): Promise<Customer>;
  updateLoyaltyPoints(id: string, points: number): Promise<void>;
}
