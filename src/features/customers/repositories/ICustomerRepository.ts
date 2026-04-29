import type {
  Customer,
  CustomerWithStats,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../types';

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByIdWithStats(id: string): Promise<CustomerWithStats | null>;
  findAllWithStats(search?: string): Promise<CustomerWithStats[]>;
  search(query: string): Promise<Customer[]>;
  findAll(): Promise<Customer[]>;
  create(dto: CreateCustomerDto): Promise<Customer>;
  update(id: string, dto: UpdateCustomerDto): Promise<Customer>;
  updateLoyaltyPoints(id: string, points: number): Promise<void>;
}
