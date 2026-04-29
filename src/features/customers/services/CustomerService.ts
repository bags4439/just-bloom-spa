import type { AuditService } from '@/core/services/AuditService';
import { DuplicateError, NotFoundError } from '@/shared/types/errors';
import type {
  Customer,
  CustomerWithStats,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../types';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';

export class CustomerService {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly auditService: AuditService,
  ) {}

  async getAll(search?: string): Promise<CustomerWithStats[]> {
    return this.customerRepo.findAllWithStats(search);
  }

  async getById(id: string): Promise<CustomerWithStats | null> {
    return this.customerRepo.findByIdWithStats(id);
  }

  async create(
    dto: Omit<CreateCustomerDto, 'createdBy'>,
    actorId: string,
    sessionId: string,
  ): Promise<Customer> {
    const customer = await this.customerRepo.create({
      ...dto,
      createdBy: actorId,
    });

    this.auditService.log({
      actorId,
      sessionId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: customer.id,
      newValue: { name: customer.name, phone: customer.phone },
    });

    return customer;
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    actorId: string,
    sessionId: string,
  ): Promise<Customer> {
    const existing = await this.customerRepo.findById(id);
    if (!existing) throw new NotFoundError('Customer', id);

    const updated = await this.customerRepo.update(id, dto);

    this.auditService.log({
      actorId,
      sessionId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: id,
      oldValue: {
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        notes: existing.notes,
      },
      newValue: dto,
    });

    return updated;
  }
}
