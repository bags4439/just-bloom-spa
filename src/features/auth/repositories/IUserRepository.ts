import type { UserRecord, CreateUserDto } from '../types';

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findAll(): Promise<UserRecord[]>;
  findActive(): Promise<UserRecord[]>;
  findSuperOwner(): Promise<UserRecord | null>;
  countAll(): Promise<number>;
  create(dto: CreateUserDto, passwordHash: string): Promise<UserRecord>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  setMustChangePassword(userId: string, value: boolean): Promise<void>;
  setActive(userId: string, isActive: boolean): Promise<void>;
  softDelete(userId: string): Promise<void>;
}
