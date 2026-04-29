import bcrypt from 'bcryptjs';

import type { AuditService } from '@/core/services/AuditService';
import type { AuthUser, UserRecord, CreateUserDto } from '@/features/auth/types';
import { UserRole, requirePermission, Permission } from '@/features/auth/types';
import { InsufficientPermissionError, NotFoundError, ValidationError } from '@/shared/types/errors';
import type { IUserRepository } from '@/features/auth/repositories/IUserRepository';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export class StaffService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async getAll(): Promise<UserRecord[]> {
    return this.userRepo.findAll();
  }

  async createStaffOrManager(
    dto: Omit<CreateUserDto, 'createdBy'>,
    actor: AuthUser,
    sessionId: string,
  ): Promise<UserRecord> {
    // Only managers and owners can create staff
    requirePermission(actor.role, Permission.MANAGE_STAFF);

    // Only owners can create managers
    if (dto.role === UserRole.MANAGER && actor.role !== UserRole.OWNER) {
      throw new InsufficientPermissionError('create a manager account');
    }

    // Nobody can create an owner via this flow
    if (dto.role === UserRole.OWNER) {
      throw new InsufficientPermissionError('create an owner account');
    }

    if (dto.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create(
      { ...dto, createdBy: actor.id },
      hash,
    );

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'STAFF_CREATED',
      entityType: 'user',
      entityId: user.id,
      newValue: { name: user.name, username: user.username, role: user.role },
    });

    return user;
  }

  async setActive(
    userId: string,
    isActive: boolean,
    actor: AuthUser,
    sessionId: string,
  ): Promise<void> {
    requirePermission(actor.role, Permission.MANAGE_STAFF);

    const target = await this.userRepo.findById(userId);
    if (!target) throw new NotFoundError('User', userId);

    // Managers cannot disable other managers or owners
    if (
      actor.role === UserRole.MANAGER &&
      (target.role === UserRole.MANAGER || target.role === UserRole.OWNER)
    ) {
      throw new InsufficientPermissionError('disable a manager or owner account');
    }

    await this.userRepo.setActive(userId, isActive);

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: isActive ? 'STAFF_ENABLED' : 'STAFF_DISABLED',
      entityType: 'user',
      entityId: userId,
    });
  }

  async resetPassword(
    userId: string,
    temporaryPassword: string,
    actor: AuthUser,
    sessionId: string,
  ): Promise<void> {
    requirePermission(actor.role, Permission.MANAGE_STAFF);

    if (temporaryPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const target = await this.userRepo.findById(userId);
    if (!target) throw new NotFoundError('User', userId);

    if (
      actor.role === UserRole.MANAGER &&
      (target.role === UserRole.MANAGER || target.role === UserRole.OWNER)
    ) {
      throw new InsufficientPermissionError("reset another manager's password");
    }

    const hash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    await this.userRepo.updatePasswordHash(userId, hash);
    await this.userRepo.setMustChangePassword(userId, true);

    this.auditService.log({
      actorId: actor.id,
      sessionId,
      action: 'STAFF_PASSWORD_RESET',
      entityType: 'user',
      entityId: userId,
    });
  }
}
