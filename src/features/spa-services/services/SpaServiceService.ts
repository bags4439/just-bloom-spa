import type { AuditService } from '@/core/services/AuditService';
import type { AuthUser } from '@/features/auth/types';
import { requirePermission, Permission } from '@/features/auth/types';
import { NotFoundError } from '@/shared/types/errors';
import type {
  SpaService,
  SpaServiceCategory,
  CreateSpaServiceDto,
  UpdateSpaServiceDto,
} from '../types';
import type { ISpaServiceRepository } from '../repositories/ISpaServiceRepository';

export class SpaServiceService {
  constructor(
    private readonly spaServiceRepo: ISpaServiceRepository,
    private readonly auditService: AuditService,
  ) {}

  async getAll(): Promise<SpaService[]> {
    return this.spaServiceRepo.findAll();
  }

  async getCategories(): Promise<SpaServiceCategory[]> {
    return this.spaServiceRepo.findAllCategories();
  }

  async create(
    dto: Omit<CreateSpaServiceDto, 'createdBy'>,
    actor: AuthUser,
    sessionId: string,
  ): Promise<SpaService> {
    requirePermission(actor.role, Permission.MANAGE_SERVICES, actor.isSuperOwner);

    const service = await this.spaServiceRepo.create({
      ...dto,
      createdBy: actor.id,
    });

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'SERVICE_CREATED',
      entityType: 'service',
      entityId: service.id,
      newValue: { name: service.name, pricePesewas: service.pricePesewas },
    });

    return service;
  }

  async update(
    id: string,
    dto: UpdateSpaServiceDto,
    actor: AuthUser,
    sessionId: string,
  ): Promise<SpaService> {
    requirePermission(actor.role, Permission.MANAGE_SERVICES, actor.isSuperOwner);

    const existing = await this.spaServiceRepo.findById(id);
    if (!existing) throw new NotFoundError('Service', id);

    const updated = await this.spaServiceRepo.update(id, dto);

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'SERVICE_UPDATED',
      entityType: 'service',
      entityId: id,
      oldValue: {
        name: existing.name,
        pricePesewas: existing.pricePesewas,
        categoryId: existing.categoryId,
      },
      newValue: dto,
    });

    return updated;
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    actor: AuthUser,
    sessionId: string,
  ): Promise<void> {
    requirePermission(actor.role, Permission.MANAGE_SERVICES, actor.isSuperOwner);

    const existing = await this.spaServiceRepo.findById(id);
    if (!existing) throw new NotFoundError('Service', id);

    await this.spaServiceRepo.toggleActive(id, isActive);

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: isActive ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED',
      entityType: 'service',
      entityId: id,
    });
  }
}
