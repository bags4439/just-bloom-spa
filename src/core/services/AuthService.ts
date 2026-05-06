import bcrypt from 'bcryptjs';

import {
  DuplicateError,
  NotFoundError,
  ValidationError,
} from '@/shared/types/errors';
import type {
  ChangePasswordDto,
  CreateUserDto,
  LoginCredentials,
  UserRecord,
} from '@/features/auth/types';
import { UserRole } from '@/features/auth/types';
import type { IUserRepository } from '@/features/auth/repositories/IUserRepository';
import type { AuditService } from './AuditService';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async getSuperOwnerId(): Promise<string | null> {
    const superOwner = await this.userRepo.findSuperOwner();
    return superOwner?.id ?? null;
  }

  async login(
    credentials: LoginCredentials,
    sessionId: string,
  ): Promise<UserRecord & { isSuperOwner: boolean }> {
    const user = await this.userRepo.findByUsername(credentials.username);
    const superOwner = await this.userRepo.findSuperOwner();

    if (!user || !user.isActive) {
      this.auditService.log({
        sessionId,
        action: 'LOGIN_FAILED',
        metadata: {
          username: credentials.username,
          reason: user ? 'account_disabled' : 'not_found',
        },
      });
      throw new ValidationError('Invalid username or password');
    }

    const isValid = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    if (!isValid) {
      this.auditService.log({
        sessionId,
        action: 'LOGIN_FAILED',
        metadata: { username: credentials.username, reason: 'wrong_password' },
      });
      throw new ValidationError('Invalid username or password');
    }

    this.auditService.log({
      actorId: user.id,
      sessionId,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
    });

    return {
      ...user,
      isSuperOwner: superOwner?.id === user.id,
    };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    this.auditService.log({
      actorId: userId,
      sessionId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: userId,
    });
  }

  async changePassword(
    dto: ChangePasswordDto,
    sessionId: string,
  ): Promise<void> {
    if (dto.newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const user = await this.userRepo.findById(dto.userId);
    if (!user) throw new NotFoundError('User', dto.userId);

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ValidationError('Current password is incorrect');
    }

    const hash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.updatePasswordHash(dto.userId, hash);
    await this.userRepo.setMustChangePassword(dto.userId, false);

    this.auditService.log({
      actorId: dto.actorId,
      sessionId,
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: dto.userId,
    });
  }

  async changePasswordForced(
    userId: string,
    newPassword: string,
    sessionId: string,
  ): Promise<void> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepo.updatePasswordHash(userId, hash);
    await this.userRepo.setMustChangePassword(userId, false);

    this.auditService.log({
      actorId: userId,
      sessionId,
      action: 'PASSWORD_CHANGED_FORCED',
      entityType: 'user',
      entityId: userId,
    });
  }

  async createUser(
    dto: CreateUserDto,
    sessionId: string,
  ): Promise<UserRecord> {
    const existing = await this.userRepo.findByUsername(dto.username);
    if (existing) throw new DuplicateError('user', 'username');

    if (dto.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create(dto, hash);

    this.auditService.log({
      actorId: dto.createdBy,
      sessionId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: user.id,
      newValue: { name: user.name, username: user.username, role: user.role },
    });

    return user;
  }

  async createOwnerAccount(
    name: string,
    username: string,
    password: string,
  ): Promise<UserRecord> {
    const count = await this.userRepo.countAll();
    if (count > 0) throw new ValidationError('Owner account already exists');

    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create(
      {
        name,
        username,
        password,
        role: UserRole.OWNER,
        createdBy: 'system',
      },
      hash,
    );

    await this.userRepo.setMustChangePassword(user.id, false);

    this.auditService.log({
      action: 'OWNER_ACCOUNT_CREATED',
      entityType: 'user',
      entityId: user.id,
    });

    return user;
  }

  async hasAnyUsers(): Promise<boolean> {
    const count = await this.userRepo.countAll();
    return count > 0;
  }
}
